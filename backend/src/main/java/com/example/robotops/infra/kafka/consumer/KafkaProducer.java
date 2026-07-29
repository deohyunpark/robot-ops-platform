package com.example.robotops.infra.kafka.consumer;

import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.request.AiAnalysisRequest;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.infra.redis.JsonUtil;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class KafkaProducer {

    private final KafkaTemplate<String, String> template;
    private final JsonUtil jsonUtil;

    public void sendTelemetry(TelemetryRawRequest telemetryRawRequest) {
        template.send(
                "robot.telemetry.raw",
                telemetryRawRequest.deviceId(),
                jsonUtil.toJson(telemetryRawRequest)
        );
    }

    public void setRedis(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.telemetry.payload",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)
        );
    }

    public void sendDeviceState(DeviceStateRequest deviceStateRequest) {
        template.send(
                "robot.device.state",
                deviceStateRequest.deviceId(),
                jsonUtil.toJson(deviceStateRequest)
        );
    }

    public void sendDashBoard(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.device.dash-board",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)
        );
    }

    public void detectDeviceEvent(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.device.event",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)
        );
    }

    public boolean sendDeviceEvent(DeviceEvent deviceEvent) {
        template.send(
                "robot.device.event.detected",
                deviceEvent.getDeviceId(),
                jsonUtil.toJson(deviceEvent)
        );
        return true;
    }

    public void detectMission(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.device.mission",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)
        );
    }

    public void countDone(String deviceId) {
        template.send(
                "robot.device.mission.done",
                deviceId
        );
    }

    public void sendThroughput(String deviceId) {
        template.send(
                "robot.device.throughput",
                deviceId
        );
    }

    public void sendTotalUtilization(String deviceId) {
        template.send(
                "robot.device.utilization",
                deviceId
        );
    }

    public void sendAllEvents(String deviceId) {
        template.send(
                "robot.device.events",
                deviceId
        );
    }

    public void sendOfflineList(String deviceId) {
        template.send(
                "robot.device.offline",
                deviceId
        );
    }

    // feed 생성
    public void createInsightFeed(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.device.feed.detect",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)

        );
    }

    //feed 저장, ws, openAI
    public CompletableFuture<SendResult<String, String>> sendInsightFeed(InsightFeedResponse insightFeedResponse) {
        return template.send(
                "robot.device.feed",
                insightFeedResponse.robotId(),
                jsonUtil.toJson(insightFeedResponse)
        );
    }

    public void createAiAnalysis(AiAnalysisRequest aiAnalysisRequest) {
        template.send(
                "robot.device.feed.analysis",
                aiAnalysisRequest.insightFeedResponse().robotId(),
                jsonUtil.toJson(aiAnalysisRequest)
        );
    }
}
