package com.example.robotops.domain.entity;

import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.infra.openai.AiSummaryResponse;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
@Table(name = "ai_analysis")
@Entity
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "robot_id", nullable = false)
    private String robotId;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "current_situation", nullable = false)
    private String currentSituation;

    @Column(name = "possible_cause", nullable = false)
    private String possibleCause;

    @Column(name = "recommendation", nullable = false)
    private String recommendation;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Builder.Default
    @OneToMany(
            mappedBy = "analysis",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<AiAnalysisInsight> aiAnalysisInsights = new ArrayList<>();

    public static AiAnalysis from(InsightFeedResponse response, AiSummaryResponse aiSummaryResponse) {

        AiAnalysis aiAnalysis = AiAnalysis.builder()
                .robotId(response.robotId())
                .riskLevel(response.riskResponse().riskLevel().name())
                .riskScore(response.riskResponse().score())
                .currentSituation(aiSummaryResponse.currentSituation())
                .recommendation(aiSummaryResponse.recommendation())
                .possibleCause(aiSummaryResponse.possibleCause())
                .build();

        response.insightResponses().forEach(insightResponse -> {
            AiAnalysisInsight insight =
                    AiAnalysisInsight.from(
                            insightResponse,
                            response.riskResponse()
                    );

            aiAnalysis.addAiAnalysis(insight);
        });

        return aiAnalysis;
    }

    public void addAiAnalysis(AiAnalysisInsight aiAnalysisInsight) {
        aiAnalysisInsight.setAnalysis(this);
        aiAnalysisInsights.add(aiAnalysisInsight);
    }
}
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "device_state")
//    private DeviceState deviceState;


