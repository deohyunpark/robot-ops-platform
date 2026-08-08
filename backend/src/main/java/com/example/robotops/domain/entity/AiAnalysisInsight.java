package com.example.robotops.domain.entity;

import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.response.DeviceRiskResponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "ai_analysis_insight")
@Entity
public class AiAnalysisInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "insight_title", nullable = false)
    private String insightTitle;

    @Column(name = "insight_description", nullable = false)
    private String insightDescription;

    @Column(name = "insight_recommendation", nullable = false)
    private String insightRecommendation;

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payload;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_analysis_id", nullable = false)
    private AiAnalysis analysis;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public static AiAnalysisInsight from(DeviceInsightResponse insight, DeviceRiskResponse risk) {
        return AiAnalysisInsight.builder()
                .score(risk.score())
                .insightTitle(insight.insightTitle())
                .insightDescription(insight.insightDescription())
                .insightRecommendation(insight.insightRecommendation())
                .payload(insight.payloadType())
                .build();
    }
}
