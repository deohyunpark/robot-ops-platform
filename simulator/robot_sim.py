import json
import time
import random
import math
import argparse
import os
import threading

from datetime import datetime, timezone, timedelta

import paho.mqtt.client as mqtt
import redis


KST = timezone(timedelta(hours=9))

DEMO_STATUS_KEY = "demo:simulation:status"
DEMO_RUNNING = "RUNNING"

COMMAND_CLEAR_EVENT = "CLEAR_EVENT"


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

    if issue == "NORMAL":
        pass

    elif issue == "LOW_BATTERY":
        robot["battery"] = clamp(
            robot["battery"] - 1,
            0,
            100
        )

        if robot["battery"] < 20:
            error_code = "LOW_BATTERY"

    elif issue == "OVERHEAT":
        robot["temp"] = clamp(
            robot["temp"] + 1,
            20,
            95
        )

        if robot["temp"] > 80:
            error_code = "OVERHEAT"

    elif issue == "OBSTACLE":
        obstacle = True
        error_code = "OBSTACLE"

    elif issue == "COLLISION":
        error_code = "COLLISION"

    elif issue == "EMERGENCY_STOP":
        estop = True
        error_code = "EMERGENCY_STOP"

    elif issue == "CPU_RISING":
        robot["cpu"] = clamp(
            robot["cpu"] + 3,
            0,
            100
        )

        if robot["cpu"] > 80:
            error_code = "CPU_RISING"

        cpu = robot["cpu"]

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


def clear_event(robot, event_type):
    """
    현재 데모 세션에서 특정 장애를 복구한다.

    핵심:
    - issue를 NORMAL로 바꿔 같은 데모 세션에서는 동일 장애가 다시 발생하지 않게 함
    - 다음 DEMO START 시 create_robots()가 다시 호출되므로 원래 장애 시나리오가 재생됨
    """

    event_type = (event_type or robot.get("issue") or "").upper()

    if event_type == "LOW_BATTERY":
        robot["battery"] = max(robot["battery"], 50.0)

    elif event_type in ("OVERHEAT", "TEMP_RISING"):
        robot["temp"] = 40.0

    elif event_type == "CPU_RISING":
        robot["cpu"] = 30.0

    elif event_type == "SPEED_RISING":
        robot["speed"] = 1.0

    elif event_type == "OFFLINE":
        robot["online"] = True
        robot["offline_after"] = float("inf")

    elif event_type == "IDLE":
        if robot["mission"] == "IDLE":
            robot["mission"] = "MOVE"

    elif event_type == "CHARGING":
        if robot["mission"] == "CHARGE":
            robot["mission"] = "MOVE"

    # OBSTACLE / COLLISION / EMERGENCY_STOP / ERROR 등은
    # apply_issue()가 issue를 보고 매번 payload에 상태를 넣으므로
    # issue만 NORMAL로 바꾸면 다음 telemetry부터 정상 상태로 나감.
    robot["issue"] = "NORMAL"
    robot["online"] = True

    print(
        f"[COMMAND] cleared event: "
        f"robot={robot['id']}, eventType={event_type}"
    )


def create_robots(robot_count, issues):
    robots = []

    for i in range(robot_count):
        rid = f"RBT-{i + 1:04d}"

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

            # 데모 시작 후 8~15초 뒤 OFFLINE
            "offline_after": time.time()
            + random.randint(8, 15),

            "x": random.uniform(0, 30),
            "y": random.uniform(0, 20),

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

    return robots


def main():
    ap = argparse.ArgumentParser()

    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--site", default="SeoulLine1")
    ap.add_argument("--robots", type=int, default=20)
    ap.add_argument("--rate", type=float, default=1)
    ap.add_argument("--qos", type=int, default=1)

    args = ap.parse_args()

    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        decode_responses=True
    )

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

    # MQTT callback thread와 simulation loop가 robots를 같이 사용하므로 lock 사용
    robots_lock = threading.Lock()
    robots_holder = {
        "robots": create_robots(
            args.robots,
            issues
        )
    }

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"robot-sim-{random.randint(1000, 9999)}"
    )

    command_topic = (
        f"factory/{args.site}/robot/+/command"
    )

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            client.subscribe(command_topic, qos=args.qos)
            print(
                f"[MQTT] subscribed command topic: {command_topic}"
            )
        else:
            print(
                f"[MQTT] connection failed: {reason_code}"
            )

    def on_message(client, userdata, msg):
        try:
            payload = json.loads(
                msg.payload.decode("utf-8")
            )
        except (UnicodeDecodeError, json.JSONDecodeError) as exception:
            print(
                "[COMMAND] invalid payload:",
                exception
            )
            return

        command = str(
            payload.get("command", "")
        ).upper()

        if command != COMMAND_CLEAR_EVENT:
            print(
                f"[COMMAND] ignored command: {command}"
            )
            return

        parts = msg.topic.split("/")

        # factory/{site}/robot/{deviceId}/command
        if len(parts) < 5:
            print(
                f"[COMMAND] invalid topic: {msg.topic}"
            )
            return

        device_id = parts[3]
        event_type = payload.get("eventType")

        with robots_lock:
            robot = next(
                (
                    robot
                    for robot in robots_holder["robots"]
                    if robot["id"] == device_id
                ),
                None
            )

            if robot is None:
                print(
                    f"[COMMAND] robot not found: {device_id}"
                )
                return

            clear_event(
                robot,
                event_type
            )

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(
        args.host,
        args.port,
        keepalive=60
    )

    client.loop_start()

    interval = 1 / max(
        args.rate,
        0.1
    )

    print(
        f"[SIMULATOR] robots={args.robots}, "
        f"rate={args.rate}, "
        f"site={args.site}"
    )

    previous_status = None

    try:
        while True:
            try:
                status = redis_client.get(
                    DEMO_STATUS_KEY
                )

            except redis.RedisError as exception:
                print(
                    "[REDIS] failed to read demo status:",
                    exception
                )
                time.sleep(2)
                continue

            # STOPPED / None -> RUNNING 진입 순간
            # 새 데모 세션이므로 모든 로봇/장애 시나리오를 다시 생성
            if (
                status == DEMO_RUNNING
                and previous_status != DEMO_RUNNING
            ):
                print(
                    "[DEMO] simulation started"
                )

                with robots_lock:
                    robots_holder["robots"] = create_robots(
                        args.robots,
                        issues
                    )

                print(
                    "[DEMO] robot state initialized"
                )

            # RUNNING -> STOPPED / TTL 만료
            if (
                status != DEMO_RUNNING
                and previous_status == DEMO_RUNNING
            ):
                print(
                    "[DEMO] simulation stopped"
                )

            previous_status = status

            # 데모 실행 중이 아니면 MQTT telemetry 발행 안 함.
            # 따라서 DEMO STOP 이후에는 새 이벤트도 발생하지 않음.
            if status != DEMO_RUNNING:
                time.sleep(1)
                continue

            start = time.time()

            with robots_lock:
                for robot in robots_holder["robots"]:
                    # 5% 확률로 mission 변경
                    if random.random() < 0.05:
                        robot["mission"] = random.choices(
                            [
                                "IDLE",
                                "MOVE",
                                "PICK",
                                "PACK",
                                "CHARGE",
                                "DONE"
                            ],
                            weights=[
                                1,
                                30,
                                30,
                                20,
                                10,
                                9
                            ],
                            k=1
                        )[0]

                    # OFFLINE 테스트
                    # offline_after 시간이 지나면 telemetry 발행 중지
                    if (
                        robot["issue"] == "OFFLINE"
                        and time.time()
                        >= robot["offline_after"]
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
                        * random.uniform(0, 0.4),
                        0,
                        30
                    )

                    robot["y"] = clamp(
                        robot["y"]
                        + math.sin(robot["theta"])
                        * random.uniform(0, 0.4),
                        0,
                        20
                    )

                    # LOW_BATTERY 로봇 제외
                    # 일반 로봇은 배터리 천천히 감소
                    if robot["issue"] != "LOW_BATTERY":
                        robot["battery"] = clamp(
                            robot["battery"]
                            - random.uniform(0, 0.001),
                            0,
                            100
                        )

                    (
                        obstacle,
                        error,
                        estop,
                        speed,
                        cpu
                    ) = apply_issue(robot)

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

            elapsed = (
                time.time()
                - start
            )

            time.sleep(
                max(
                    0,
                    interval - elapsed
                )
            )

    except KeyboardInterrupt:
        print(
            "[SIMULATOR] interrupted"
        )

    finally:
        client.loop_stop()
        client.disconnect()

        print(
            "[SIMULATOR] disconnected"
        )


if __name__ == "__main__":
    main()