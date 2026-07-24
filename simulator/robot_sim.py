import json
import time
import random
import math
import argparse
from datetime import datetime, timezone, timedelta
import paho.mqtt.client as mqtt


KST = timezone(timedelta(hours=9))


def now_kst_iso():
    return datetime.now(KST).isoformat(timespec="milliseconds")


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def make_payload(
        robot,
        obstacle,
        error_code,
        estop=False,
        speed=None,
        cpu=None
):
    return {
        "ts": now_kst_iso(),
        "robotId": robot["id"],
        "seq": robot["seq"],

        "state": {
            "online": robot["online"],
            "mode": "AUTO",
            "mission": robot["mission"],
            "batteryPct": round(robot["battery"], 2),
            "speedMps": round(
                speed if speed is not None else robot["speed"],
                2
            )
        },

        "pose": {
            "x": round(robot["x"], 3),
            "y": round(robot["y"], 3),
            "theta": round(robot["theta"], 4),
            "mapId": "MAP-A-1F"
        },

        "health": {
            "cpuPct": round(
                cpu if cpu is not None else robot["cpu"],
                1
            ),
            "memPct": round(robot["mem"], 1),
            "tempC": round(robot["temp"], 1)
        },

        "safety": {
            "estop": estop,
            "bumper": error_code == "COLLISION",
            "obstacle": obstacle
        },

        "errors": (
            []
            if error_code is None
            else [
                {
                    "code": error_code,
                    "level": "WARN"
                }
            ]
        )
    }


def apply_issue(robot):

    issue = robot["issue"]

    obstacle = False
    error_code = None
    estop = False
    speed = None
    cpu = None


    # 정상
    if issue == "NORMAL":
        pass


    # 배터리 부족
    elif issue == "LOW_BATTERY":
        robot["battery"] = clamp(
            robot["battery"] - 1,
            0,
            100
        )

        if robot["battery"] < 20:
            error_code = "LOW_BATTERY"


    # 과열
    elif issue == "OVERHEAT":
        robot["temp"] = clamp(
            robot["temp"] + 1,
            20,
            95
        )

        if robot["temp"] > 80:
            error_code = "OVERHEAT"


    # 장애물
    elif issue == "OBSTACLE":
        obstacle = True
        error_code = "OBSTACLE"


    # 충돌
    elif issue == "COLLISION":
        error_code = "COLLISION"


    # 비상정지
    elif issue == "EMERGENCY_STOP":
        estop = True
        error_code = "EMERGENCY_STOP"


    # CPU 상승
    elif issue == "CPU_RISING":
        robot["cpu"] = clamp(
            robot["cpu"] + 3,
            0,
            100
        )

        if robot["cpu"] > 80:
            error_code = "CPU_RISING"

        cpu = robot["cpu"]


    # 속도 상승
    elif issue == "SPEED_RISING":

        robot["speed"] = clamp(
            robot["speed"] + 0.2,
            0,
            3
        )

        if robot["speed"] > 2:
            error_code = "SPEED_RISING"

        speed = robot["speed"]


    return obstacle, error_code, estop, speed, cpu



def main():

    ap = argparse.ArgumentParser()

    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--site", default="SeoulLine1")
    ap.add_argument("--robots", type=int, default=20)
    ap.add_argument("--rate", type=float, default=1)
    ap.add_argument("--qos", type=int, default=1)

    args = ap.parse_args()


    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"robot-sim-{random.randint(1000,9999)}"
    )


    client.connect(
        args.host,
        args.port,
        keepalive=60
    )

    client.loop_start()


    issues = [
        "NORMAL",
        "LOW_BATTERY",
        "OVERHEAT",
        "OBSTACLE",
        "COLLISION",
        "EMERGENCY_STOP",
        "CPU_RISING",
        "SPEED_RISING",
        "OFFLINE"
    ]


    robots = []


    for i in range(args.robots):

        rid = f"RBT-{i+1:04d}"

        issue = (
            issues[i]
            if i < len(issues)
            else "NORMAL"
        )


        robots.append({

            "id": rid,

            "issue": issue,

            "seq": 0,

            "online": True,

            "mission": random.choices(
                [
                    "IDLE",
                    "MOVE",
                    "PICK",
                    "PACK",
                    "CHARGE"
                ],
                weights=[5, 25, 25, 25, 20],
                k=1
            )[0],
            "offline_after": time.time() + random.randint(8, 15),

            "x": random.uniform(0,30),
            "y": random.uniform(0,20),
            "theta": random.uniform(
                -math.pi,
                math.pi
            ),

            "battery": random.uniform(
                40,
                100
            ),

            "temp": random.uniform(
                35,
                50
            ),

            "cpu": random.uniform(
                20,
                40
            ),

            "mem": random.uniform(
                20,
                60
            ),

            "speed": random.uniform(
                0.5,
                1.5
            )
        })


    interval = 1 / max(args.rate,0.1)


    print(
        f"robots={args.robots}"
    )


    try:

        while True:

            start=time.time()


            for robot in robots:

    # 5% 확률로 mission 변경
                if random.random() < 0.05:
                    robot["mission"] = random.choices([
                        "IDLE",
                        "MOVE",
                        "PICK",
                        "PACK",
                        "CHARGE",
                        "DONE"
                    ],
                    weights=[1, 30, 30, 20, 10, 9],
                    k=1
                    )[0]
                # OFFLINE 테스트
                if (
                    robot["issue"] == "OFFLINE"
                    and time.time() >= robot["offline_after"]
                ):
                    robot["online"] = False
                    continue

                robot["seq"] += 1




                robot["theta"] += random.uniform(
                    -0.2,
                    0.2
                )


                robot["x"] = clamp(
                    robot["x"]
                    + math.cos(robot["theta"])
                    * random.uniform(0,0.4),
                    0,
                    30
                )


                robot["y"] = clamp(
                    robot["y"]
                    + math.sin(robot["theta"])
                    * random.uniform(0,0.4),
                    0,
                    20
                )


                # LOW_BATTERY 로봇 제외, 일반 로봇만 천천히 감소
                if robot["issue"] != "LOW_BATTERY":
                    robot["battery"] = clamp(
                        robot["battery"] - random.uniform(0, 0.001),
                        0,
                        100
                    )

                obstacle, error, estop, speed, cpu = apply_issue(robot)



                payload = make_payload(
                    robot,
                    obstacle,
                    error,
                    estop,
                    speed,
                    cpu
                )


                topic = (
                    f"factory/{args.site}"
                    f"/robot/{robot['id']}"
                    "/telemetry"
                )


                client.publish(
                    topic,
                    json.dumps(payload),
                    qos=args.qos,
                    retain=False
                )


            elapsed=time.time()-start

            time.sleep(
                max(
                    0,
                    interval-elapsed
                )
            )


    except KeyboardInterrupt:
        pass


    finally:
        client.loop_stop()
        client.disconnect()



if __name__ == "__main__":
    main()