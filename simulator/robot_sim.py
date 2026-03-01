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
            "mission": random.choice(["IDLE","PICK","PACK","MOVE","CHARGE"]),
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
        "safety": {"estop": False, "bumper": False, "obstacle": obstacle},
        "errors": ([] if not error_code else [{"code": error_code, "level": "WARN"}])
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--site", default="SeoulLine1")
    ap.add_argument("--robots", type=int, default=20)
    ap.add_argument("--rate", type=float, default=1.0)
    ap.add_argument("--qos", type=int, default=1)
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
            "id": rid, "seq": 0,
            "x": random.uniform(0, 30),
            "y": random.uniform(0, 20),
            "theta": random.uniform(-math.pi, math.pi),
            "battery": random.uniform(40, 100),
            "temp": random.uniform(35, 55),
        })

    interval = 1.0 / max(args.rate, 0.1)
    print(f"Publishing robots={args.robots}, rate={args.rate} msg/s/robot to {args.host}:{args.port}")

    try:
        while True:
            start = time.time()
            for r in robots:
                r["seq"] += 1
                r["theta"] += random.uniform(-0.2, 0.2)
                r["x"] = clamp(r["x"] + math.cos(r["theta"]) * random.uniform(0.0, 0.4), 0, 30)
                r["y"] = clamp(r["y"] + math.sin(r["theta"]) * random.uniform(0.0, 0.4), 0, 20)
                r["battery"] = clamp(r["battery"] - random.uniform(0.00, 0.05), 0, 100)
                r["temp"] = clamp(r["temp"] + random.uniform(-0.2, 0.5), 20, 95)

                obstacle = (random.random() < 0.03)
                error_code = None
                if random.random() < 0.01:
                    error_code = random.choice(["LIDAR_OCCLUDED", "MOTOR_OVER_CURRENT", "WHEEL_SLIP"])
                if r["temp"] > 82 and random.random() < 0.2:
                    error_code = "OVERHEAT"

                payload = make_payload(r["id"], r["seq"], r["x"], r["y"], r["theta"], r["battery"], r["temp"], obstacle, error_code)
                topic = f"factory/{args.site}/robot/{r['id']}/telemetry"
                client.publish(topic, json.dumps(payload), qos=args.qos, retain=False)

            elapsed = time.time() - start
            time.sleep(max(0.0, interval - elapsed))
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
