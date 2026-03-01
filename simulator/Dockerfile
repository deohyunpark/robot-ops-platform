FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir paho-mqtt
COPY robot_sim.py /app/robot_sim.py
ENV MQTT_HOST=mqtt MQTT_PORT=1883 SITE_ID=SeoulLine1 ROBOTS=30 RATE=1 QOS=1
CMD ["sh","-c","python /app/robot_sim.py --host $MQTT_HOST --port $MQTT_PORT --site $SITE_ID --robots $ROBOTS --rate $RATE --qos $QOS"]
