#!/usr/bin/env python3
"""Standalone servo tester for the Smart Speed Bump.

Moves the obstacle servo so you can confirm the wiring and tune the duty values
WITHOUT running the whole radar pipeline. Reads defaults from the obstacle
section of config/device_pipeline.json; everything is overridable on the CLI.

Run from the device/ folder:
    python3 src/servo_test.py                  # cycle deploy<->neutral 5 times
    python3 src/servo_test.py --cycles 20
    python3 src/servo_test.py --deploy 11 --neutral 7.5 --hold 1.0
    python3 src/servo_test.py --interactive    # press Enter to toggle deploy/neutral
    python3 src/servo_test.py --sweep          # step the duty to find the servo's range

NOTE: stop the auto-run service first so it isn't also driving the pin:
    sudo systemctl stop radar
"""
import argparse
import json
import time

try:
    import RPi.GPIO as GPIO
except Exception:
    GPIO = None


DEFAULT_CONFIG = "config/device_pipeline.json"


def load_obstacle_cfg(path):
    try:
        with open(path) as f:
            return json.load(f).get("obstacle", {})
    except Exception:
        return {}


def main():
    p = argparse.ArgumentParser(description="Test/tune the obstacle servo")
    p.add_argument("--config", default=DEFAULT_CONFIG)
    p.add_argument("--pin", type=int, help="BCM pin (default from config, 18)")
    p.add_argument("--freq", type=float, help="PWM frequency Hz (default 50)")
    p.add_argument("--neutral", type=float, help="neutral duty %")
    p.add_argument("--deploy", type=float, help="deploy duty %")
    p.add_argument("--hold", type=float, help="seconds held deployed")
    p.add_argument("--cycles", type=int, default=5, help="deploy/neutral cycles")
    p.add_argument("--interactive", action="store_true", help="press Enter to toggle")
    p.add_argument("--sweep", action="store_true", help="step duty 2.5->12.5% to find range")
    args = p.parse_args()

    cfg = load_obstacle_cfg(args.config)
    pin = args.pin if args.pin is not None else int(cfg.get("gpioPin", 18))
    freq = args.freq if args.freq is not None else float(cfg.get("pwmFreqHz", 50))
    neutral = args.neutral if args.neutral is not None else float(cfg.get("neutralDuty", 7.5))
    deploy = args.deploy if args.deploy is not None else float(cfg.get("deployDuty", 11.0))
    hold = args.hold if args.hold is not None else float(cfg.get("holdSec", 0.8))

    print(f"Servo test  pin(BCM)={pin}  freq={freq}Hz  neutral={neutral}%  deploy={deploy}%  hold={hold}s")

    if GPIO is None:
        print("[MOCK] RPi.GPIO not available - simulating only (run this on the Pi).")
        pwm = None
    else:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(pin, GPIO.OUT)
        pwm = GPIO.PWM(pin, freq)
        pwm.start(neutral)

    def set_duty(duty, label):
        print(f"  -> {label} ({duty}%)")
        if pwm is not None:
            pwm.ChangeDutyCycle(duty)

    try:
        time.sleep(0.5)
        if args.sweep:
            print("Sweeping duty - note where the servo starts and stops moving:")
            duty = 2.5
            while duty <= 12.5 + 1e-6:
                set_duty(round(duty, 1), f"duty {duty:.1f}")
                time.sleep(0.7)
                duty += 0.5
            set_duty(neutral, "neutral")
        elif args.interactive:
            print("Interactive: press Enter to DEPLOY / return, Ctrl+C to quit.")
            deployed = False
            while True:
                input()
                deployed = not deployed
                set_duty(deploy if deployed else neutral, "DEPLOY" if deployed else "neutral")
        else:
            for i in range(args.cycles):
                print(f"Cycle {i + 1}/{args.cycles}")
                set_duty(deploy, "DEPLOY")
                time.sleep(hold)
                set_duty(neutral, "neutral")
                time.sleep(max(0.4, hold))
        print("Done.")
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        if pwm is not None:
            set_duty(neutral, "neutral (rest)")
            time.sleep(0.3)
            pwm.stop()
            GPIO.cleanup()
            print("GPIO cleaned up.")


if __name__ == "__main__":
    main()
