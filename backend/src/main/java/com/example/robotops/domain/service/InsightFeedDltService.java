package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.InsightFeedDltMessage;
import com.example.robotops.domain.enums.InsightFeedDltStatus;
import com.example.robotops.domain.repository.InsightFeedDltRepository;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.response.InsightFeedDltResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.JsonUtil;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsightFeedDltService {

    private final InsightFeedDltRepository insightFeedDltRepository;
    private final KafkaProducer kafkaProducer;
    private final JsonUtil jsonUtil;

    @Transactional
    public InsightFeedDltResponse save(String originalTopic, String payload) {
        InsightFeedDltMessage saved = insightFeedDltRepository.save(
                InsightFeedDltMessage.pending(
                        originalTopic,
                        payload,
                        extractRobotId(payload)
                )
        );

        log.warn(
                "Persisted insight feed DLT message. id={}, topic={}, robotId={}",
                saved.getId(),
                originalTopic,
                saved.getRobotId()
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InsightFeedDltResponse> findAll(InsightFeedDltStatus status) {
        List<InsightFeedDltMessage> messages = status == null
                ? insightFeedDltRepository.findAllByOrderByFailedAtDesc()
                : insightFeedDltRepository.findAllByStatusOrderByFailedAtDesc(status);

        return messages.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InsightFeedDltResponse findById(Long id) {
        return toResponse(getMessage(id));
    }

    @Transactional
    public InsightFeedDltResponse replay(Long id) {
        InsightFeedDltMessage message = getMessage(id);
        ensurePending(message);

        String key = message.getRobotId() != null
                ? message.getRobotId()
                : "unknown";

        kafkaProducer.replayInsightFeed(key, message.getPayload()).join();
        message.markReplayed(OffsetDateTime.now());

        log.info("Replayed insight feed DLT message. id={}, robotId={}", id, message.getRobotId());

        return toResponse(message);
    }

    @Transactional
    public InsightFeedDltResponse discard(Long id) {
        InsightFeedDltMessage message = getMessage(id);
        ensurePending(message);

        message.markDiscarded();

        log.info("Discarded insight feed DLT message. id={}, robotId={}", id, message.getRobotId());

        return toResponse(message);
    }

    private InsightFeedDltMessage getMessage(Long id) {
        return insightFeedDltRepository.findById(id)
                .orElseThrow(() -> new RobotOpsException(ErrorCode.INSIGHT_FEED_DLT_NOT_FOUND));
    }

    private void ensurePending(InsightFeedDltMessage message) {
        if (message.getStatus() != InsightFeedDltStatus.PENDING) {
            throw new RobotOpsException(ErrorCode.INSIGHT_FEED_DLT_ALREADY_PROCESSED);
        }
    }

    private String extractRobotId(String payload) {
        try {
            InsightFeedResponse response = jsonUtil.fromJson(payload, InsightFeedResponse.class);
            return response.robotId();
        } catch (RuntimeException exception) {
            log.warn("Failed to extract robotId from DLT payload", exception);
            return null;
        }
    }

    private InsightFeedDltResponse toResponse(InsightFeedDltMessage message) {
        return new InsightFeedDltResponse(
                message.getId(),
                message.getOriginalTopic(),
                message.getPayload(),
                message.getRobotId(),
                message.getStatus(),
                message.getFailedAt(),
                message.getReplayedAt()
        );
    }
}
