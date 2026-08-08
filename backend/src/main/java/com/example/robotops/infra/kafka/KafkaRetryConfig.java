package com.example.robotops.infra.kafka;

import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafkaRetryTopic;

@Configuration
@EnableKafkaRetryTopic
public class KafkaRetryConfig {
}
