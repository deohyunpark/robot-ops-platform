package com.example.robotops.domain.entity;

import com.example.robotops.domain.enums.InsightFeedDltStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "insight_feed_dlt_message")
@Entity
public class InsightFeedDltMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_topic", nullable = false)
    private String originalTopic;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "robot_id")
    private String robotId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InsightFeedDltStatus status;

    @CreationTimestamp
    @Column(name = "failed_at", nullable = false)
    private OffsetDateTime failedAt;

    @Column(name = "replayed_at")
    private OffsetDateTime replayedAt;

    public static InsightFeedDltMessage pending(
            String originalTopic,
            String payload,
            String robotId
    ) {
        return InsightFeedDltMessage.builder()
                .originalTopic(originalTopic)
                .payload(payload)
                .robotId(robotId)
                .status(InsightFeedDltStatus.PENDING)
                .build();
    }

    public void markReplayed(OffsetDateTime replayedAt) {
        this.status = InsightFeedDltStatus.REPLAYED;
        this.replayedAt = replayedAt;
    }

    public void markDiscarded() {
        this.status = InsightFeedDltStatus.DISCARDED;
    }
}
