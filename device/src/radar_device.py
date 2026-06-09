import argparse
import json
import math
import os
import queue
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from uplink import fetch_device_radar_config, load_uplink_config, post_event


DEFAULT_CONFIG_PATH = "config/device_pipeline.json"
DEFAULT_UPLINK_CONFIG_PATH = "config/uplink.json"
DEFAULT_DB_PATH = "data/spool/uplink_queue.db"
DEFAULT_DEBUG_PATH = "data/debug/live_overlay.jpg"


MOBILENET_SSD_CLASSES = [
    "background",
    "aeroplane",
    "bicycle",
    "bird",
    "boat",
    "bottle",
    "bus",
    "car",
    "cat",
    "chair",
    "cow",
    "diningtable",
    "dog",
    "horse",
    "motorbike",
    "person",
    "pottedplant",
    "sheep",
    "sofa",
    "train",
    "tvmonitor",
]

VEHICLE_CLASS_IDS = {6, 7, 14, 19}  # bus, car, motorbike, train

try:
    import RPi.GPIO as GPIO  # type: ignore
except Exception:
    GPIO = None


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_parent(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def load_json(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def point_line_side(point: Tuple[int, int], line: Dict[str, int]) -> float:
    px, py = point
    x1, y1, x2, y2 = line["x1"], line["y1"], line["x2"], line["y2"]
    return (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)


def sign_with_deadzone(value: float, epsilon: float) -> int:
    if value > epsilon:
        return 1
    if value < -epsilon:
        return -1
    return 0


def clamp_roi(roi: Dict[str, int], width: int, height: int) -> Dict[str, int]:
    x = max(0, min(width - 1, int(roi["x"])))
    y = max(0, min(height - 1, int(roi["y"])))
    w = max(1, min(width - x, int(roi["w"])))
    h = max(1, min(height - y, int(roi["h"])))
    return {"x": x, "y": y, "w": w, "h": h}


def draw_line(frame: np.ndarray, line: Dict[str, int], label: str, color: Tuple[int, int, int]) -> None:
    cv2.line(frame, (line["x1"], line["y1"]), (line["x2"], line["y2"]), color, 2)
    cv2.putText(
        frame,
        label,
        (line["x1"], max(20, line["y1"] - 8)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        color,
        2,
    )


class SQLiteQueue:
    def __init__(self, db_path: str):
        self.db_path = db_path
        ensure_parent(db_path)
        self._init_db()

    def _connect(self):
        return sqlite3.connect(self.db_path, timeout=10)

    def _init_db(self):
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS uplink_queue (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL DEFAULT 0,
                    last_error TEXT,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_uplink_queue_ready
                ON uplink_queue(next_attempt_at, created_at)
                """
            )
            conn.commit()

    def enqueue(self, event_id: str, payload: Dict) -> None:
        raw_payload = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO uplink_queue (id, payload, attempts, next_attempt_at, created_at)
                VALUES (?, ?, 0, ?, ?)
                """,
                (event_id, raw_payload, now, now),
            )
            conn.commit()

    def fetch_ready(self, limit: int = 5) -> List[sqlite3.Row]:
        now = time.time()
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT id, payload, attempts
                FROM uplink_queue
                WHERE next_attempt_at <= ?
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (now, limit),
            )
            return cur.fetchall()

    def mark_sent(self, event_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM uplink_queue WHERE id = ?", (event_id,))
            conn.commit()

    def mark_retry(self, event_id: str, attempts: int, error_message: str, base_backoff: float, max_backoff: float):
        next_attempt = time.time() + min(max_backoff, base_backoff * (2 ** max(0, attempts)))
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE uplink_queue
                SET attempts = attempts + 1, next_attempt_at = ?, last_error = ?
                WHERE id = ?
                """,
                (next_attempt, error_message[:800], event_id),
            )
            conn.commit()


@dataclass
class Detection:
    bbox: Tuple[int, int, int, int]  # x, y, w, h
    centroid: Tuple[int, int]
    label: Optional[str] = None
    confidence: Optional[float] = None


class VehicleDetector:
    def __init__(self, cfg: Dict):
        self.cfg = cfg
        self.mode = cfg["detector"]["mode"]
        self.roi = cfg["scene"]["roi"]
        self.min_contour_area = cfg["detector"]["minContourArea"]
        self.bg = cv2.createBackgroundSubtractorMOG2(
            history=cfg["detector"]["bgHistory"],
            varThreshold=cfg["detector"]["bgVarThreshold"],
            detectShadows=False,
        )

        self.dnn_enabled = False
        self.dnn_every_n_frames = max(1, int(cfg["detector"]["dnnEveryNFrames"]))
        self.frame_count = 0
        self.last_dnn_detections: List[Detection] = []

        dnn_cfg = cfg["detector"].get("dnn", {})
        proto = dnn_cfg.get("protoPath")
        model = dnn_cfg.get("modelPath")
        if proto and model and os.path.exists(proto) and os.path.exists(model):
            self.net = cv2.dnn.readNetFromCaffe(proto, model)
            self.dnn_conf_th = float(dnn_cfg.get("confidenceThreshold", 0.4))
            self.dnn_enabled = True
            print(f"[INFO] DNN vehicle recognition enabled: {proto}, {model}")
        else:
            self.net = None
            if self.mode in {"dnn", "hybrid"}:
                print("[WARN] DNN files missing; falling back to background-subtractor detection.")

    def _detect_bg(self, frame: np.ndarray) -> List[Detection]:
        roi = self.roi
        crop = frame[roi["y"] : roi["y"] + roi["h"], roi["x"] : roi["x"] + roi["w"]]
        if crop.size == 0:
            return []

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (7, 7), 0)

        mask = self.bg.apply(gray)
        _, th = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)
        th = cv2.morphologyEx(th, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=2)
        th = cv2.dilate(th, np.ones((3, 3), np.uint8), iterations=2)

        contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        detections: List[Detection] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.min_contour_area:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            x_full = roi["x"] + x
            y_full = roi["y"] + y
            cx = x_full + w // 2
            cy = y_full + h // 2
            detections.append(
                Detection(
                    bbox=(x_full, y_full, w, h),
                    centroid=(cx, cy),
                    label="vehicle_like",
                    confidence=None,
                )
            )
        return detections

    def _detect_dnn(self, frame: np.ndarray) -> List[Detection]:
        roi = self.roi
        crop = frame[roi["y"] : roi["y"] + roi["h"], roi["x"] : roi["x"] + roi["w"]]
        if crop.size == 0:
            return []

        blob = cv2.dnn.blobFromImage(
            cv2.resize(crop, (300, 300)),
            scalefactor=0.007843,
            size=(300, 300),
            mean=127.5,
        )
        self.net.setInput(blob)
        preds = self.net.forward()

        detections: List[Detection] = []
        for i in range(preds.shape[2]):
            confidence = float(preds[0, 0, i, 2])
            class_id = int(preds[0, 0, i, 1])
            if confidence < self.dnn_conf_th:
                continue
            if class_id not in VEHICLE_CLASS_IDS:
                continue

            box = preds[0, 0, i, 3:7] * np.array([roi["w"], roi["h"], roi["w"], roi["h"]])
            x1, y1, x2, y2 = box.astype(int)
            x1 = max(0, min(roi["w"] - 1, x1))
            y1 = max(0, min(roi["h"] - 1, y1))
            x2 = max(x1 + 1, min(roi["w"], x2))
            y2 = max(y1 + 1, min(roi["h"], y2))

            w = x2 - x1
            h = y2 - y1
            x_full = roi["x"] + x1
            y_full = roi["y"] + y1
            cx = x_full + w // 2
            cy = y_full + h // 2

            detections.append(
                Detection(
                    bbox=(x_full, y_full, w, h),
                    centroid=(cx, cy),
                    label=MOBILENET_SSD_CLASSES[class_id],
                    confidence=confidence,
                )
            )
        return detections

    def detect(self, frame: np.ndarray) -> List[Detection]:
        self.frame_count += 1

        if self.mode == "bg":
            return self._detect_bg(frame)

        if self.mode in {"dnn", "hybrid"} and self.dnn_enabled:
            if self.frame_count % self.dnn_every_n_frames == 0:
                self.last_dnn_detections = self._detect_dnn(frame)
            if self.mode == "dnn":
                return self.last_dnn_detections
            if self.last_dnn_detections:
                return self.last_dnn_detections

        return self._detect_bg(frame)


@dataclass
class Track:
    track_id: int
    centroid: Tuple[int, int]
    bbox: Tuple[int, int, int, int]
    label: Optional[str]
    confidence: Optional[float]
    age: int = 1
    missed: int = 0
    prev_side_1: Optional[int] = None
    prev_side_2: Optional[int] = None
    crossings: List[Tuple[str, float]] = field(default_factory=list)
    last_event_at: float = 0.0


class HealthMonitor:
    def __init__(self, cfg: Dict):
        health_cfg = cfg["health"]
        self.enabled = bool(health_cfg["enabled"])
        self.log_every_sec = float(health_cfg["logEverySec"])
        self.write_status_file = bool(health_cfg["writeStatusFile"])
        self.print_to_console = bool(health_cfg["printToConsole"])
        self.status_file_path = health_cfg["statusFilePath"]
        if self.write_status_file:
            ensure_parent(self.status_file_path)

        self._lock = threading.Lock()
        self._last_publish = 0.0
        self._status: Dict[str, Any] = {
            "startedAt": iso_now(),
            "lastUpdatedAt": None,
            "runtime": {
                "fps": 0.0,
                "activeTracks": 0,
                "eventCount": 0,
                "queueDepth": 0,
                "cameraReadFailures": 0,
                "lastEventAt": None,
            },
            "uplink": {
                "sentCount": 0,
                "failedCount": 0,
                "lastSentAt": None,
                "lastFailedAt": None,
                "lastError": None,
                "lastEventId": None,
            },
        }

    def update_runtime(
        self,
        fps: float,
        active_tracks: int,
        event_count: int,
        queue_depth: int,
        camera_read_failures: int,
        last_event_at: Optional[str],
    ) -> None:
        if not self.enabled:
            return
        with self._lock:
            self._status["lastUpdatedAt"] = iso_now()
            self._status["runtime"] = {
                "fps": round(float(fps), 2),
                "activeTracks": int(active_tracks),
                "eventCount": int(event_count),
                "queueDepth": int(queue_depth),
                "cameraReadFailures": int(camera_read_failures),
                "lastEventAt": last_event_at,
            }

    def record_uplink_success(self, event_id: str) -> None:
        if not self.enabled:
            return
        with self._lock:
            self._status["lastUpdatedAt"] = iso_now()
            self._status["uplink"]["sentCount"] += 1
            self._status["uplink"]["lastSentAt"] = iso_now()
            self._status["uplink"]["lastEventId"] = event_id

    def record_uplink_failure(self, event_id: str, error_message: str) -> None:
        if not self.enabled:
            return
        with self._lock:
            self._status["lastUpdatedAt"] = iso_now()
            self._status["uplink"]["failedCount"] += 1
            self._status["uplink"]["lastFailedAt"] = iso_now()
            self._status["uplink"]["lastEventId"] = event_id
            self._status["uplink"]["lastError"] = error_message[:800]

    def get_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return json.loads(json.dumps(self._status))

    def publish(self, force: bool = False) -> None:
        if not self.enabled:
            return
        now = time.time()
        if not force and now - self._last_publish < self.log_every_sec:
            return
        self._last_publish = now

        snapshot = self.get_snapshot()

        if self.write_status_file:
            with open(self.status_file_path, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2)

        if self.print_to_console:
            runtime = snapshot["runtime"]
            uplink = snapshot["uplink"]
            print(
                "[HEALTH]"
                f" fps={runtime['fps']}"
                f" tracks={runtime['activeTracks']}"
                f" events={runtime['eventCount']}"
                f" queue={runtime['queueDepth']}"
                f" camFail={runtime['cameraReadFailures']}"
                f" uplink(sent={uplink['sentCount']}, failed={uplink['failedCount']})"
            )


class RadarLimitClient:
    def __init__(self, uplink_cfg_path: str, cfg: Dict):
        obstacle_cfg = cfg["obstacle"]
        self.enabled = bool(obstacle_cfg["enabled"])
        self.default_limit = float(obstacle_cfg["defaultSpeedLimitKmh"])
        self.poll_sec = float(obstacle_cfg["refreshSpeedLimitSec"])
        self.timeout_sec = float(obstacle_cfg["fetchTimeoutSec"])
        self.uplink_cfg_path = uplink_cfg_path
        self._uplink_cfg = None
        self._current_limit = self.default_limit
        self._last_fetch_at = 0.0

    @property
    def current_limit(self) -> float:
        return self._current_limit

    def _ensure_uplink_cfg(self):
        if self._uplink_cfg is None:
            self._uplink_cfg = load_uplink_config(self.uplink_cfg_path)

    def refresh_if_due(self):
        if not self.enabled:
            return
        now = time.time()
        if now - self._last_fetch_at < self.poll_sec:
            return
        self._last_fetch_at = now

        try:
            self._ensure_uplink_cfg()
            data = fetch_device_radar_config(self._uplink_cfg, timeout_sec=self.timeout_sec)
            server_limit = data.get("speedLimit")
            parsed = float(server_limit)
            if math.isfinite(parsed) and parsed > 0:
                self._current_limit = parsed
        except Exception as exc:
            print(f"[WARN] speedLimit refresh failed, using cached value ({self._current_limit}): {exc}")


class ServoObstacle:
    def __init__(self, cfg: Dict):
        obstacle_cfg = cfg["obstacle"]
        self.enabled = bool(obstacle_cfg["enabled"])
        self.pin = int(obstacle_cfg["gpioPin"])
        self.pwm_freq_hz = int(obstacle_cfg["pwmFreqHz"])
        self.neutral_duty = float(obstacle_cfg["neutralDuty"])
        self.deploy_duty = float(obstacle_cfg["deployDuty"])
        self.hold_sec = float(obstacle_cfg["holdSec"])
        self.cooldown_sec = float(obstacle_cfg["cooldownSec"])
        self.mock_when_missing = bool(obstacle_cfg["mockModeWhenGpioMissing"])

        self._last_trigger_at = 0.0
        self._trigger_q: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=20)
        self._stop_event = threading.Event()
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._pwm = None
        self._gpio_active = False

        if not self.enabled:
            return

        if GPIO is None:
            if self.mock_when_missing:
                print("[WARN] RPi.GPIO unavailable. Servo obstacle running in MOCK mode.")
            else:
                print("[WARN] RPi.GPIO unavailable. Servo obstacle disabled.")
                self.enabled = False
            return

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin, GPIO.OUT)
        self._pwm = GPIO.PWM(self.pin, self.pwm_freq_hz)
        self._pwm.start(self.neutral_duty)
        self._gpio_active = True
        time.sleep(0.2)
        self._pwm.ChangeDutyCycle(0)
        print(f"[INFO] Servo obstacle initialized on GPIO {self.pin}.")

    def start(self):
        if self.enabled:
            self._worker.start()

    def trigger(self, speed_kmh: float, speed_limit: float, event_id: str):
        if not self.enabled:
            return
        payload = {
            "speedKmh": round(speed_kmh, 2),
            "speedLimit": round(speed_limit, 2),
            "eventId": event_id,
            "ts": iso_now(),
        }
        try:
            self._trigger_q.put_nowait(payload)
        except queue.Full:
            pass

    def _run(self):
        while not self._stop_event.is_set():
            try:
                item = self._trigger_q.get(timeout=0.3)
            except queue.Empty:
                continue

            now = time.time()
            if now - self._last_trigger_at < self.cooldown_sec:
                continue

            self._last_trigger_at = now
            if self._gpio_active and self._pwm is not None:
                try:
                    self._pwm.ChangeDutyCycle(self.deploy_duty)
                    time.sleep(self.hold_sec)
                    self._pwm.ChangeDutyCycle(self.neutral_duty)
                    time.sleep(0.15)
                    self._pwm.ChangeDutyCycle(0)
                    print(
                        f"[OBSTACLE] deployed event={item['eventId']} speed={item['speedKmh']}"
                        f" limit={item['speedLimit']}"
                    )
                except Exception as exc:
                    print(f"[WARN] Servo actuation failed: {exc}")
            else:
                print(
                    f"[OBSTACLE-MOCK] deploy event={item['eventId']} speed={item['speedKmh']}"
                    f" limit={item['speedLimit']}"
                )

    def stop(self):
        if not self.enabled:
            return
        self._stop_event.set()
        if self._worker.is_alive():
            self._worker.join(timeout=2.0)
        if self._gpio_active and self._pwm is not None:
            try:
                self._pwm.ChangeDutyCycle(self.neutral_duty)
                time.sleep(0.1)
                self._pwm.stop()
            except Exception:
                pass
            try:
                GPIO.cleanup(self.pin)
            except Exception:
                pass


class MultiObjectTracker:
    def __init__(self, cfg: Dict):
        self.cfg = cfg
        self.next_track_id = 1
        self.tracks: Dict[int, Track] = {}
        self.max_match_distance = float(cfg["tracking"]["maxMatchDistancePx"])
        self.max_missed = int(cfg["tracking"]["maxMissedFrames"])

    def update(self, detections: List[Detection]) -> List[Track]:
        track_ids = list(self.tracks.keys())
        det_ids = list(range(len(detections)))
        matches: List[Tuple[float, int, int]] = []

        for tid in track_ids:
            tx, ty = self.tracks[tid].centroid
            for di in det_ids:
                dx, dy = detections[di].centroid
                dist = math.hypot(dx - tx, dy - ty)
                if dist <= self.max_match_distance:
                    matches.append((dist, tid, di))

        matches.sort(key=lambda x: x[0])
        used_tracks = set()
        used_dets = set()

        for _, tid, di in matches:
            if tid in used_tracks or di in used_dets:
                continue
            used_tracks.add(tid)
            used_dets.add(di)
            det = detections[di]
            tr = self.tracks[tid]
            tr.centroid = det.centroid
            tr.bbox = det.bbox
            tr.label = det.label or tr.label
            tr.confidence = det.confidence if det.confidence is not None else tr.confidence
            tr.age += 1
            tr.missed = 0

        for tid in track_ids:
            if tid not in used_tracks:
                self.tracks[tid].missed += 1

        stale_ids = [tid for tid, tr in self.tracks.items() if tr.missed > self.max_missed]
        for tid in stale_ids:
            del self.tracks[tid]

        for di in det_ids:
            if di in used_dets:
                continue
            det = detections[di]
            tid = self.next_track_id
            self.next_track_id += 1
            self.tracks[tid] = Track(
                track_id=tid,
                centroid=det.centroid,
                bbox=det.bbox,
                label=det.label,
                confidence=det.confidence,
            )

        return list(self.tracks.values())


class UplinkWorker(threading.Thread):
    def __init__(
        self,
        queue: SQLiteQueue,
        uplink_cfg_path: str,
        stop_event: threading.Event,
        cfg: Dict,
        health: Optional[HealthMonitor] = None,
    ):
        super().__init__(daemon=True)
        self.queue = queue
        self.uplink_cfg_path = uplink_cfg_path
        self.stop_event = stop_event
        self.health = health
        self.retry_base = float(cfg["uplink"]["retryBaseSec"])
        self.retry_max = float(cfg["uplink"]["retryMaxSec"])
        self.poll_sec = float(cfg["uplink"]["pollSec"])

    def run(self):
        uplink_cfg = load_uplink_config(self.uplink_cfg_path)
        print("[INFO] Uplink worker started.")
        while not self.stop_event.is_set():
            rows = self.queue.fetch_ready(limit=5)
            if not rows:
                self.stop_event.wait(self.poll_sec)
                continue

            for row in rows:
                event_id = row["id"]
                attempts = int(row["attempts"])
                try:
                    payload = json.loads(row["payload"])
                    post_event(
                        uplink_cfg,
                        speed_kmh=payload["speedKmh"],
                        captured_at=payload["capturedAt"],
                        meta=payload.get("meta", {}),
                        timeout_sec=float(payload.get("timeoutSec", 8.0)),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude"),
                    )
                    self.queue.mark_sent(event_id)
                    if self.health:
                        self.health.record_uplink_success(event_id)
                    print(f"[UPLINK] sent event {event_id}")
                except Exception as exc:
                    self.queue.mark_retry(
                        event_id=event_id,
                        attempts=attempts,
                        error_message=str(exc),
                        base_backoff=self.retry_base,
                        max_backoff=self.retry_max,
                    )
                    if self.health:
                        self.health.record_uplink_failure(event_id, str(exc))
                    print(f"[UPLINK] retry scheduled for {event_id}: {exc}")


def load_config(path: str) -> Dict:
    cfg = load_json(path)

    cfg.setdefault("camera", {})
    cfg.setdefault("scene", {})
    cfg.setdefault("detector", {})
    cfg.setdefault("tracking", {})
    cfg.setdefault("uplink", {})
    cfg.setdefault("debug", {})
    cfg.setdefault("device", {})
    cfg.setdefault("health", {})
    cfg.setdefault("obstacle", {})

    cfg["camera"].setdefault("deviceIndex", 0)
    cfg["camera"].setdefault("width", 1280)
    cfg["camera"].setdefault("height", 720)
    cfg["camera"].setdefault("fps", 30)
    cfg["camera"].setdefault("fourcc", "MJPG")

    cfg["scene"].setdefault("metersBetweenLines", 8.0)
    cfg["scene"]["roi"] = cfg["scene"]["roi"]
    cfg["scene"]["line1"] = cfg["scene"]["line1"]
    cfg["scene"]["line2"] = cfg["scene"]["line2"]

    cfg["detector"].setdefault("mode", "hybrid")  # bg | dnn | hybrid
    cfg["detector"].setdefault("minContourArea", 3500)
    cfg["detector"].setdefault("bgHistory", 300)
    cfg["detector"].setdefault("bgVarThreshold", 25)
    cfg["detector"].setdefault("dnnEveryNFrames", 2)
    cfg["detector"].setdefault("dnn", {})

    cfg["tracking"].setdefault("maxMatchDistancePx", 80)
    cfg["tracking"].setdefault("maxMissedFrames", 8)
    cfg["tracking"].setdefault("minTrackAgeFrames", 4)
    cfg["tracking"].setdefault("crossingEpsilonPx", 6)
    cfg["tracking"].setdefault("maxCrossingWindowSec", 4.0)
    cfg["tracking"].setdefault("eventCooldownSec", 1.2)
    cfg["tracking"].setdefault("minSpeedKmh", 2.0)
    cfg["tracking"].setdefault("maxSpeedKmh", 250.0)

    cfg["uplink"].setdefault("pollSec", 0.5)
    cfg["uplink"].setdefault("retryBaseSec", 1.0)
    cfg["uplink"].setdefault("retryMaxSec", 30.0)

    cfg["debug"].setdefault("showWindow", False)
    cfg["debug"].setdefault("saveOverlay", True)
    cfg["debug"].setdefault("saveOverlayEverySec", 2.0)
    cfg["debug"].setdefault("overlayPath", DEFAULT_DEBUG_PATH)

    cfg["device"].setdefault("latitude", None)
    cfg["device"].setdefault("longitude", None)

    cfg["health"].setdefault("enabled", True)
    cfg["health"].setdefault("logEverySec", 5.0)
    cfg["health"].setdefault("writeStatusFile", True)
    cfg["health"].setdefault("printToConsole", True)
    cfg["health"].setdefault("statusFilePath", "data/health/status.json")

    cfg["obstacle"].setdefault("enabled", False)
    cfg["obstacle"].setdefault("defaultSpeedLimitKmh", 50.0)
    cfg["obstacle"].setdefault("refreshSpeedLimitSec", 10.0)
    cfg["obstacle"].setdefault("fetchTimeoutSec", 6.0)
    cfg["obstacle"].setdefault("gpioPin", 18)
    cfg["obstacle"].setdefault("pwmFreqHz", 50)
    cfg["obstacle"].setdefault("neutralDuty", 7.5)
    cfg["obstacle"].setdefault("deployDuty", 11.0)
    cfg["obstacle"].setdefault("holdSec", 0.8)
    cfg["obstacle"].setdefault("cooldownSec", 2.0)
    cfg["obstacle"].setdefault("mockModeWhenGpioMissing", True)

    return cfg


def draw_overlay(
    frame: np.ndarray,
    cfg: Dict,
    tracks: List[Track],
    events_count: int,
    queue_depth: int,
    fps: float,
):
    roi = cfg["scene"]["roi"]
    cv2.rectangle(
        frame,
        (roi["x"], roi["y"]),
        (roi["x"] + roi["w"], roi["y"] + roi["h"]),
        (255, 255, 255),
        2,
    )
    draw_line(frame, cfg["scene"]["line1"], "line1", (0, 255, 255))
    draw_line(frame, cfg["scene"]["line2"], "line2", (255, 255, 0))

    for tr in tracks:
        x, y, w, h = tr.bbox
        cv2.rectangle(frame, (x, y), (x + w, y + h), (40, 200, 40), 2)
        cv2.circle(frame, tr.centroid, 4, (40, 200, 40), -1)
        label = tr.label or "obj"
        text = f"id={tr.track_id} {label}"
        cv2.putText(
            frame,
            text,
            (x, max(15, y - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (40, 200, 40),
            2,
        )

    cv2.putText(frame, f"events={events_count}", (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"queue={queue_depth}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"fps={fps:.1f}", (10, 76), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)


def get_queue_depth(queue: SQLiteQueue) -> int:
    with sqlite3.connect(queue.db_path) as conn:
        cur = conn.execute("SELECT COUNT(*) FROM uplink_queue")
        row = cur.fetchone()
        return int(row[0] if row else 0)


def create_event_payload(
    speed_kmh: float,
    track: Track,
    dt: float,
    direction: str,
    speed_limit_kmh: float,
    cfg: Dict,
) -> Dict:
    local_event_id = str(uuid.uuid4())
    lat = cfg["device"].get("latitude")
    lon = cfg["device"].get("longitude")
    payload = {
        "eventId": local_event_id,
        "capturedAt": iso_now(),
        "speedKmh": round(float(speed_kmh), 2),
        "meta": {
            "source": "rpi-camera",
            "localEventId": local_event_id,
            "trackId": track.track_id,
            "direction": direction,
            "deltaTimeSec": round(dt, 4),
            "speedLimitKmh": round(speed_limit_kmh, 2),
            "isOverLimit": bool(speed_kmh > speed_limit_kmh),
            "label": track.label,
            "confidence": round(track.confidence, 3) if track.confidence is not None else None,
            "bbox": {"x": track.bbox[0], "y": track.bbox[1], "w": track.bbox[2], "h": track.bbox[3]},
        },
    }

    if lat is not None and lon is not None:
        payload["latitude"] = float(lat)
        payload["longitude"] = float(lon)
    return payload


def process_crossings(track: Track, now: float, cfg: Dict) -> Optional[Tuple[float, float, str]]:
    line1 = cfg["scene"]["line1"]
    line2 = cfg["scene"]["line2"]
    epsilon = float(cfg["tracking"]["crossingEpsilonPx"])
    min_age = int(cfg["tracking"]["minTrackAgeFrames"])
    if track.age < min_age:
        return None

    s1 = sign_with_deadzone(point_line_side(track.centroid, line1), epsilon)
    s2 = sign_with_deadzone(point_line_side(track.centroid, line2), epsilon)

    crossed_line = None
    if track.prev_side_1 is not None and track.prev_side_1 != 0 and s1 != 0 and s1 != track.prev_side_1:
        crossed_line = "line1"
    elif track.prev_side_2 is not None and track.prev_side_2 != 0 and s2 != 0 and s2 != track.prev_side_2:
        crossed_line = "line2"

    track.prev_side_1 = s1
    track.prev_side_2 = s2

    if not crossed_line:
        return None

    track.crossings.append((crossed_line, now))
    if len(track.crossings) > 6:
        track.crossings = track.crossings[-6:]

    if len(track.crossings) < 2:
        return None

    prev_line, prev_time = track.crossings[-2]
    curr_line, curr_time = track.crossings[-1]
    if prev_line == curr_line:
        return None

    dt = curr_time - prev_time
    if dt <= 0:
        return None

    max_window = float(cfg["tracking"]["maxCrossingWindowSec"])
    if dt > max_window:
        return None

    cooldown = float(cfg["tracking"]["eventCooldownSec"])
    if now - track.last_event_at < cooldown:
        return None

    meters = float(cfg["scene"]["metersBetweenLines"])
    speed_kmh = (meters / dt) * 3.6
    min_speed = float(cfg["tracking"]["minSpeedKmh"])
    max_speed = float(cfg["tracking"]["maxSpeedKmh"])
    if speed_kmh < min_speed or speed_kmh > max_speed:
        return None

    track.last_event_at = now
    direction = f"{prev_line}_to_{curr_line}"
    return speed_kmh, dt, direction


def run_pipeline(cfg_path: str, uplink_cfg_path: str):
    cfg = load_config(cfg_path)

    camera = cfg["camera"]
    cap = cv2.VideoCapture(camera["deviceIndex"], cv2.CAP_V4L2)
    if not cap.isOpened():
        raise RuntimeError("Cannot open camera. Check device index and permissions.")

    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*camera["fourcc"]))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, camera["width"])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, camera["height"])
    cap.set(cv2.CAP_PROP_FPS, camera["fps"])

    ok, first_frame = cap.read()
    if not ok or first_frame is None:
        raise RuntimeError("Failed to capture first frame from camera.")
    frame_h, frame_w = first_frame.shape[:2]
    cfg["scene"]["roi"] = clamp_roi(cfg["scene"]["roi"], frame_w, frame_h)

    detector = VehicleDetector(cfg)
    tracker = MultiObjectTracker(cfg)
    speed_limit_client = RadarLimitClient(uplink_cfg_path, cfg)
    obstacle = ServoObstacle(cfg)
    obstacle.start()

    spool_queue = SQLiteQueue(DEFAULT_DB_PATH)
    health = HealthMonitor(cfg)
    stop_event = threading.Event()
    uplink_worker = UplinkWorker(spool_queue, uplink_cfg_path, stop_event, cfg, health=health)
    uplink_worker.start()

    events_count = 0
    last_event_at: Optional[str] = None
    camera_read_failures = 0
    fps = 0.0
    fps_counter = 0
    fps_t0 = time.perf_counter()
    health_t0 = time.time()

    last_debug_save = 0.0
    debug_every = float(cfg["debug"]["saveOverlayEverySec"])
    overlay_path = cfg["debug"]["overlayPath"]
    ensure_parent(overlay_path)

    print("[INFO] Device pipeline started. Press CTRL+C to stop.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                camera_read_failures += 1
                time.sleep(0.02)
                continue

            fps_counter += 1
            fps_dt = time.perf_counter() - fps_t0
            if fps_dt >= 1.0:
                fps = fps_counter / fps_dt
                fps_counter = 0
                fps_t0 = time.perf_counter()

            now = time.perf_counter()
            detections = detector.detect(frame)
            tracks = tracker.update(detections)
            speed_limit_client.refresh_if_due()
            speed_limit_kmh = speed_limit_client.current_limit

            for tr in tracks:
                result = process_crossings(tr, now, cfg)
                if not result:
                    continue
                speed_kmh, dt, direction = result
                event_payload = create_event_payload(
                    speed_kmh=speed_kmh,
                    track=tr,
                    dt=dt,
                    direction=direction,
                    speed_limit_kmh=speed_limit_kmh,
                    cfg=cfg,
                )
                spool_queue.enqueue(event_payload["eventId"], event_payload)
                if speed_kmh > speed_limit_kmh:
                    obstacle.trigger(speed_kmh, speed_limit_kmh, event_payload["eventId"])
                events_count += 1
                last_event_at = event_payload["capturedAt"]
                print(
                    f"[EVENT] speed={event_payload['speedKmh']} km/h"
                    f" limit={speed_limit_kmh}"
                    f" dir={direction} track={tr.track_id} eventId={event_payload['eventId']}"
                )

            queue_depth = get_queue_depth(spool_queue)
            health.update_runtime(
                fps=fps,
                active_tracks=len(tracks),
                event_count=events_count,
                queue_depth=queue_depth,
                camera_read_failures=camera_read_failures,
                last_event_at=last_event_at,
            )
            if time.time() - health_t0 >= float(cfg["health"]["logEverySec"]):
                health.publish()
                health_t0 = time.time()

            if cfg["debug"]["showWindow"] or cfg["debug"]["saveOverlay"]:
                overlay = frame.copy()
                draw_overlay(overlay, cfg, tracks, events_count, queue_depth, fps)

                if cfg["debug"]["showWindow"]:
                    cv2.imshow("radar_device", overlay)
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord("q"):
                        break

                if cfg["debug"]["saveOverlay"] and (time.time() - last_debug_save) >= debug_every:
                    cv2.imwrite(overlay_path, overlay)
                    last_debug_save = time.time()
    except KeyboardInterrupt:
        print("[INFO] Stopping device pipeline...")
    finally:
        health.publish(force=True)
        obstacle.stop()
        stop_event.set()
        uplink_worker.join(timeout=2.0)
        cap.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Raspberry Pi radar speed + uplink pipeline")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to device pipeline config JSON")
    parser.add_argument("--uplink", default=DEFAULT_UPLINK_CONFIG_PATH, help="Path to uplink config JSON")
    args = parser.parse_args()

    run_pipeline(args.config, args.uplink)


if __name__ == "__main__":
    main()
