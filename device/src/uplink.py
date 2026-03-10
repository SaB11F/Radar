import json, time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests

@dataclass
class UplinkConfig:
    backend_url: str
    radar_id: str
    device_key: str

def load_uplink_config(path: str) -> UplinkConfig:
    with open(path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return UplinkConfig(
        backend_url=cfg["backendUrl"].rstrip("/"),
        radar_id=cfg["radarId"],
        device_key=cfg["deviceKey"],
    )

def post_event(
    cfg: UplinkConfig,
    speed_kmh: float,
    captured_at: str,
    meta: Dict[str, Any],
    timeout_sec: float = 8.0,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    url = f"{cfg.backend_url}/api/device/events"
    headers = {
        "X-RADAR-ID": cfg.radar_id,
        "X-DEVICE-KEY": cfg.device_key,
        "Content-Type": "application/json",
    }
    payload = {
        "speedKmh": float(speed_kmh),
        "capturedAt": captured_at,
        "meta": meta or {},
    }
    if latitude is not None and longitude is not None:
        payload["latitude"] = float(latitude)
        payload["longitude"] = float(longitude)

    r = requests.post(url, headers=headers, json=payload, timeout=timeout_sec)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}

    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code}: {body}")
    return body

def post_event_with_retry(
    cfg: UplinkConfig,
    speed_kmh: float,
    captured_at: str,
    meta: Dict[str, Any],
    retries: int = 3,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    last_err = None
    for i in range(retries):
        try:
            return post_event(
                cfg,
                speed_kmh,
                captured_at,
                meta,
                latitude=latitude,
                longitude=longitude,
            )
        except Exception as e:
            last_err = e
            time.sleep(1.2 * (i + 1))
    raise last_err
