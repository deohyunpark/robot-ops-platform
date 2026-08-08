package com.example.robotops.domain.repository;

import static com.example.robotops.domain.entity.QAiAnalysis.aiAnalysis;

import com.example.robotops.domain.entity.AiAnalysis;
import com.example.robotops.domain.response.AiAnalysisResponse;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AiAnalysisRepositoryCustomImpl implements AiAnalysisRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<AiAnalysisResponse> findRecentAiAnalysis() {
        List<AiAnalysis> aiAnalyses = queryFactory
                .selectFrom(aiAnalysis)
                .orderBy(aiAnalysis.createdAt.desc())
                .limit(15)
                .fetch();

        return aiAnalyses.stream().map(AiAnalysisResponse::of).toList();
    }
}
