package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.EventAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventActionRepository extends JpaRepository<EventAction, Long>, EventActionRepositoryCustom {
}
