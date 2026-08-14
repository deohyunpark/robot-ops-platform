package com.example.robotops.infra.kafka;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "robotops.kafka")
public class KafkaInsightTopicProperties {

    // robot.device.feed.* topic partition 수 (기존 topic은 기동 시 increase)
    private int insightFeedPartitions = 6;

    private int insightOpenAiConcurrency = 6;

    // false면 AdminClient partition 조정 스킵
    private boolean ensurePartitions = true;
}
