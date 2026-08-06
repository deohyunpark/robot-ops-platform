package com.example.robotops.domain.service;

import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPublishService {

    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;

    public void publishIfNeeded(InsightFeedResponse insightFeedResponse) {

        String aiSignature = redisService.updatePending(insightFeedResponse);

        if (!redisService.isChangedFromPublished(insightFeedResponse, aiSignature)) {
            return;
        }

        if(!redisService.acquireAiCoolDown(insightFeedResponse.robotId())) {
            return;
        }

        kafkaProducer.sendInsightFeed(insightFeedResponse)
                .whenComplete( (result, exception) -> {
                    if(exception != null) {
                        redisService.deleteAiCoolDown(insightFeedResponse.robotId());
                        return;
                    }
                    var metadata = result.getRecordMetadata();

                    log.info(
                            "[KAFKA_SEND] key={}, partition={}, offset={}",
                            insightFeedResponse.robotId(),
                            metadata.partition(),
                            metadata.offset()
                    );

                    redisService.updatePending(insightFeedResponse);
                });

    }



}
