package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.InsightFeedDltMessage;
import com.example.robotops.domain.enums.InsightFeedDltStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InsightFeedDltRepository extends JpaRepository<InsightFeedDltMessage, Long> {

    List<InsightFeedDltMessage> findAllByStatusOrderByFailedAtDesc(InsightFeedDltStatus status);

    List<InsightFeedDltMessage> findAllByOrderByFailedAtDesc();
}
