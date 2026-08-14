package com.example.robotops.infra.kafka;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.CreatePartitionsResult;
import org.apache.kafka.clients.admin.NewPartitions;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.common.errors.UnknownTopicOrPartitionException;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;

@Configuration
@EnableConfigurationProperties(KafkaInsightTopicProperties.class)
public class KafkaInsightTopicConfig {

    public static final String TOPIC_FEED_DETECT = "robot.device.feed.detect";
    public static final String TOPIC_FEED = "robot.device.feed";
    public static final String TOPIC_FEED_ANALYSIS = "robot.device.feed.analysis";

    @Bean
    KafkaAdmin.NewTopics insightFeedTopics(KafkaInsightTopicProperties properties) {
        int partitions = properties.getInsightFeedPartitions();
        return new KafkaAdmin.NewTopics(
                TopicBuilder.name(TOPIC_FEED_DETECT).partitions(partitions).replicas(1).build(),
                TopicBuilder.name(TOPIC_FEED).partitions(partitions).replicas(1).build(),
                TopicBuilder.name(TOPIC_FEED_ANALYSIS).partitions(partitions).replicas(1).build()
        );
    }

    @Slf4j
    @RequiredArgsConstructor
    @ConditionalOnProperty(
            prefix = "robotops.kafka",
            name = "ensure-partitions",
            havingValue = "true",
            matchIfMissing = true
    )
    static class KafkaPartitionInitializer implements ApplicationRunner {

        private final KafkaAdmin kafkaAdmin;
        private final KafkaInsightTopicProperties properties;

        @Override
        public void run(ApplicationArguments args) {
            int target = properties.getInsightFeedPartitions();
            List<String> topics = List.of(
                    TOPIC_FEED_DETECT,
                    TOPIC_FEED,
                    TOPIC_FEED_ANALYSIS
            );

            try (AdminClient admin = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
                for (String topic : topics) {
                    ensurePartitionCount(admin, topic, target);
                }
            } catch (RuntimeException ex) {
                log.warn(
                        "[KAFKA] partition ensure skipped (broker unavailable?). target={}, error={}",
                        target,
                        ex.getMessage()
                );
            }
        }

        private void ensurePartitionCount(AdminClient admin, String topic, int target) {
            try {
                TopicDescription description = admin.describeTopics(List.of(topic))
                        .allTopicNames()
                        .get()
                        .get(topic);

                if (description == null) {
                    log.info("[KAFKA] topic {} not found yet — NewTopic bean will create it", topic);
                    return;
                }

                int current = description.partitions().size();
                if (current >= target) {
                    log.info("[KAFKA] topic {} partitions OK (current={}, target={})", topic, current, target);
                    return;
                }

                CreatePartitionsResult result = admin.createPartitions(
                        Map.of(topic, NewPartitions.increaseTo(target))
                );
                result.all().get();
                log.info("[KAFKA] topic {} partitions increased {} → {}", topic, current, target);
            } catch (ExecutionException ex) {
                if (ex.getCause() instanceof UnknownTopicOrPartitionException) {
                    log.info("[KAFKA] topic {} not found — will be created with {} partitions", topic, target);
                    return;
                }
                log.warn("[KAFKA] failed to increase partitions for {}: {}", topic, ex.getMessage());
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("[KAFKA] interrupted while increasing partitions for {}", topic);
            }
        }
    }
}
