package com.example.robotops.infra.kafka.producer;

import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsightConsumer {

    private final JsonUtil jsonUtil;

    // todo
//    @KafkaListener(topics = "robot.device.feed", groupId = "all")
//    public void saveDB(String message) {
//        InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);
//
//        List<DeviceInsightResponse> deviceInsightResponses = insightFeedResponse.insightResponses();
//        DeviceRiskResponse deviceRiskResponse = insightFeedResponse.riskResponse();
//
//    }


}
