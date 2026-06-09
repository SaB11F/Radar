#!/usr/bin/env bash
# ONE-TIME setup: make the radar pipeline start automatically on every boot.
# Run this once (from anywhere):   bash ~/Radar/device/install_service.sh
# After this you never touch it again - the Pi runs the program on power-up.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing radar auto-run service..."
sudo cp "$DIR/radar.service" /etc/systemd/system/radar.service
sudo systemctl daemon-reload
sudo systemctl enable radar
sudo systemctl restart radar

echo
echo "Done! The radar now starts automatically on every boot."
echo "Live logs:   journalctl -u radar -f"
echo "Stop it:     sudo systemctl stop radar   (needed before running manually)"
echo
sudo systemctl status radar --no-pager || true
