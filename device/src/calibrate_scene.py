import argparse
import json
import os
from typing import Dict, List, Tuple

import cv2


DEFAULT_CONFIG_PATH = "config/device_pipeline.json"


def load_config(path: str) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(path: str, cfg: Dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    print(f"[OK] Saved config: {path}")


def draw_scene(frame, cfg: Dict, mode_text: str):
    out = frame.copy()
    scene = cfg["scene"]
    roi = scene["roi"]
    line1 = scene["line1"]
    line2 = scene["line2"]

    cv2.rectangle(out, (roi["x"], roi["y"]), (roi["x"] + roi["w"], roi["y"] + roi["h"]), (255, 255, 255), 2)
    cv2.line(out, (line1["x1"], line1["y1"]), (line1["x2"], line1["y2"]), (0, 255, 255), 2)
    cv2.line(out, (line2["x1"], line2["y1"]), (line2["x2"], line2["y2"]), (255, 255, 0), 2)

    cv2.putText(out, f"Mode: {mode_text}", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(
        out,
        f"metersBetweenLines: {scene['metersBetweenLines']:.2f}",
        (12, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (255, 255, 255),
        2,
    )
    cv2.putText(
        out,
        "r=ROI 1=line1 2=line2 +/- meters n=new frame s=save q=quit",
        (12, out.shape[0] - 16),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (255, 255, 255),
        1,
    )
    return out


def main():
    parser = argparse.ArgumentParser(description="Scene calibration tool for radar camera")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to pipeline config")
    args = parser.parse_args()

    cfg = load_config(args.config)
    cam = cfg["camera"]
    cap = cv2.VideoCapture(cam["deviceIndex"], cv2.CAP_V4L2)
    if not cap.isOpened():
        raise RuntimeError("Cannot open camera. Check device index and permissions.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, cam["width"])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, cam["height"])
    cap.set(cv2.CAP_PROP_FPS, cam["fps"])

    ok, frame = cap.read()
    if not ok or frame is None:
        raise RuntimeError("Failed to capture frame from camera.")

    line_target = None
    line_points: List[Tuple[int, int]] = []
    mode = "idle"

    def on_mouse(event, x, y, _flags, _param):
        nonlocal line_points
        if event == cv2.EVENT_LBUTTONDOWN and line_target is not None:
            line_points.append((x, y))
            if len(line_points) == 2:
                cfg["scene"][line_target] = {
                    "x1": int(line_points[0][0]),
                    "y1": int(line_points[0][1]),
                    "x2": int(line_points[1][0]),
                    "y2": int(line_points[1][1]),
                }
                print(f"[OK] {line_target} updated.")
                line_points = []

    cv2.namedWindow("calibrate_scene")
    cv2.setMouseCallback("calibrate_scene", on_mouse)

    try:
        while True:
            preview = draw_scene(frame, cfg, mode)
            cv2.imshow("calibrate_scene", preview)
            key = cv2.waitKey(20) & 0xFF

            if key == ord("q"):
                break
            if key == ord("n"):
                ok, new_frame = cap.read()
                if ok and new_frame is not None:
                    frame = new_frame
                    print("[INFO] grabbed new frame.")
                continue

            if key == ord("r"):
                mode = "set ROI"
                x, y, w, h = cv2.selectROI("calibrate_scene", frame, fromCenter=False, showCrosshair=True)
                if w > 0 and h > 0:
                    cfg["scene"]["roi"] = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
                    print(f"[OK] ROI updated: {cfg['scene']['roi']}")
                mode = "idle"
                continue

            if key == ord("1"):
                mode = "click 2 points for line1"
                line_target = "line1"
                line_points = []
                print("[INFO] click start/end points for line1.")
                continue

            if key == ord("2"):
                mode = "click 2 points for line2"
                line_target = "line2"
                line_points = []
                print("[INFO] click start/end points for line2.")
                continue

            if key in (ord("+"), ord("=")):
                cfg["scene"]["metersBetweenLines"] = round(float(cfg["scene"]["metersBetweenLines"]) + 0.1, 2)
                print(f"[OK] metersBetweenLines = {cfg['scene']['metersBetweenLines']}")
                continue

            if key in (ord("-"), ord("_")):
                cfg["scene"]["metersBetweenLines"] = round(
                    max(0.1, float(cfg["scene"]["metersBetweenLines"]) - 0.1), 2
                )
                print(f"[OK] metersBetweenLines = {cfg['scene']['metersBetweenLines']}")
                continue

            if key == ord("s"):
                save_config(args.config, cfg)
                continue

    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
