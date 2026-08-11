package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.EventAction;
import java.util.Optional;

public interface EventActionRepositoryCustom {

    Optional<EventAction> findByIdWithCheckList(long id);
}
