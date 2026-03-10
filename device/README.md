# Device Pipeline (Raspberry Pi)

This folder now includes a production-style device pipeline with:

- two-way line crossing speed estimation
- optional OpenCV DNN vehicle recognition
- persistent local queue (SQLite) for reliable uplink
- background uplink worker (measure + send in parallel)
- calibration tool (no hardcoded ROI/line edits in code)
- health monitor (FPS, queue depth, camera failures, uplink counters)

## 1) Configure

- Device pipeline config: `config/device_pipeline.json`
- Uplink config: `config/uplink.json` (copy from `config/uplink.example.json`)

If you want DNN recognition, place model files at:

- `models/MobileNetSSD_deploy.prototxt`
- `models/MobileNetSSD_deploy.caffemodel`

If model files are missing, pipeline falls back to background-subtractor detection.

## 2) Calibrate scene (ROI + lines + meter distance)

```bash
python src/calibrate_scene.py --config config/device_pipeline.json
```

Controls:

- `r` set ROI rectangle
- `1` set `line1` (click 2 points)
- `2` set `line2` (click 2 points)
- `+/-` adjust `metersBetweenLines`
- `n` capture new frame
- `s` save config
- `q` quit

## 3) Run pipeline

```bash
python src/radar_device.py --config config/device_pipeline.json --uplink config/uplink.json
```

Outputs:

- local queue DB: `data/spool/uplink_queue.db`
- debug overlay image: `data/debug/live_overlay.jpg`
- health status JSON: `data/health/status.json`

## Notes

- Speed is computed when a tracked object crosses `line1 -> line2` or `line2 -> line1`.
- Direction is included in event meta.
- Device coordinates (`device.latitude`, `device.longitude`) are sent with each event if set.
- Health reporting cadence/file are configurable under `health` in `device_pipeline.json`.
