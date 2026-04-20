import json, time, random, math, argparse
from datetime import datetime, timezone, timedelta
import paho.mqtt.client as mqtt

KST = timezone(timedelta(hours=9))


def now_kst_iso():
    return datetime.now(KST).isoformat(timespec="milliseconds")


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def make_payload(robot_id, seq, x, y, theta, battery, temp, obstacle, error_code):
    return {
        "ts": now_kst_iso(),
        "robotId": robot_id,
        "seq": seq,
        "state": {
            "online": True,
            "mode": "AUTO",
            "mission": random.choice(["IDLE", "PICK", "PACK", "MOVE", "CHARGE"]),
            "batteryPct": round(battery, 2),
            "speedMps": round(random.uniform(0.0, 1.8), 2)
        },
        "pose": {
            "x": round(x, 3),
            "y": round(y, 3),
            "theta": round(theta, 4),
            "mapId": "MAP-A-1F"
        },
        "health": {
            "cpuPct": round(random.uniform(10, 70), 1),
            "memPct": round(random.uniform(20, 85), 1),
            "tempC": round(temp, 1)
        },
        "safety": {
            "estop": False,
            "bumper": False,
            "obstacle": obstacle
        },
        "errors": ([] if not error_code else [
            {"code": error_code, "level": "WARN"}
        ])
    }


def main():
    ap = argparse.ArgumentParser()

    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--site", default="SeoulLine1")
    ap.add_argument("--robots", type=int, default=20)
    ap.add_argument("--rate", type=float, default=1.0)
    ap.add_argument("--qos", type=int, default=1)

    # 추가: 랜덤 끊김 테스트
    ap.add_argument("--drop-rate", type=float, default=0.2,
                    help="매 루프마다 로봇이 오프라인 될 확률")

    ap.add_argument("--drop-seconds-min", type=int, default=10)
    ap.add_argument("--drop-seconds-max", type=int, default=30)

    args = ap.parse_args()

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"robot-sim-{random.randint(1000,9999)}"
    )

    client.connect(args.host, args.port, keepalive=60)
    client.loop_start()

    robots = []

    for i in range(args.robots):
        rid = f"RBT-{i+1:04d}"

        robots.append({
            "id": rid,
            "seq": 0,
            "x": random.uniform(0, 30),
            "y": random.uniform(0, 20),
            "theta": random.uniform(-math.pi, math.pi),
            "battery": random.uniform(40, 100),
            "temp": random.uniform(35, 55),

            # 오프라인 테스트용
            "offline_until": 0
        })

    interval = 1.0 / max(args.rate, 0.1)

    print(
        f"Publishing robots={args.robots}, "
        f"rate={args.rate} msg/s/robot, "
        f"dropRate={args.drop_rate}"
    )

    try:
        while True:
            start = time.time()
            now = time.time()

            for r in robots:

                # ---------------------------
                # 현재 오프라인 상태면 publish 안 함
                # ---------------------------
                if now < r["offline_until"]:
                    continue

                # ---------------------------
                # 랜덤 오프라인 진입
                # ---------------------------
                if random.random() < args.drop_rate:
                    sec = random.randint(
                        args.drop_seconds_min,
                        args.drop_seconds_max
                    )

                    r["offline_until"] = now + sec

                    print(f"[DROP] {r['id']} offline {sec}s")
                    continue

                # ---------------------------
                # 정상 telemetry 발행
                # ---------------------------
                r["seq"] += 1
                r["theta"] += random.uniform(-0.2, 0.2)

                r["x"] = clamp(
                    r["x"] + math.cos(r["theta"]) * random.uniform(0.0, 0.4),
                    0, 30
                )

                r["y"] = clamp(
                    r["y"] + math.sin(r["theta"]) * random.uniform(0.0, 0.4),
                    0, 20
                )

                r["battery"] = clamp(
                    r["battery"] - random.uniform(0.00, 0.05),
                    0, 100
                )

                r["temp"] = clamp(
                    r["temp"] + random.uniform(-0.2, 0.5),
                    20, 95
                )

                obstacle = (random.random() < 0.03)

                error_code = None

                if random.random() < 0.01:
                    error_code = random.choice([
                        "LIDAR_OCCLUDED",
                        "MOTOR_OVER_CURRENT",
                        "WHEEL_SLIP"
                    ])

                if r["temp"] > 82 and random.random() < 0.2:
                    error_code = "OVERHEAT"

                payload = make_payload(
                    r["id"], r["seq"],
                    r["x"], r["y"], r["theta"],
                    r["battery"], r["temp"],
                    obstacle, error_code
                )

                topic = f"factory/{args.site}/robot/{r['id']}/telemetry"

                client.publish(
                    topic,
                    json.dumps(payload),
                    qos=args.qos,
                    retain=False
                )

            elapsed = time.time() - start
            time.sleep(max(0.0, interval - elapsed))

    except KeyboardInterrupt:
        pass

    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()