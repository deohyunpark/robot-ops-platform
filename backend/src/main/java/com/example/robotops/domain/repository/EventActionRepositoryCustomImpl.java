package com.example.robotops.domain.repository;

import static com.example.robotops.domain.entity.QActionCheckList.actionCheckList;
import static com.example.robotops.domain.entity.QActionChecklistItem.actionChecklistItem;
import static com.example.robotops.domain.entity.QEventAction.eventAction;

import com.example.robotops.domain.entity.EventAction;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class EventActionRepositoryCustomImpl implements EventActionRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Optional<EventAction> findByIdWithCheckList(long id) {
        EventAction action = queryFactory.selectFrom(eventAction)
                .leftJoin(eventAction.actionCheckList, actionCheckList).fetchJoin()
                .leftJoin(actionCheckList.items, actionChecklistItem).fetchJoin()
                .where(eventAction.id.eq(id))
                .fetchOne();

        return Optional.ofNullable(action);
    }
}
