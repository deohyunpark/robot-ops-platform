package com.example.robotops.domain.repository;

import static com.example.robotops.domain.entity.QDeviceEvent.deviceEvent;
import static org.springframework.util.StringUtils.hasText;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.BeanPropertySqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;


@Repository
@RequiredArgsConstructor
public class DeviceEventRepositoryImpl implements DeviceEventRepositoryCustom {


    private static final String SQL = """
        INSERT INTO device_event (
            device_id,
            event_type,
            severity,
            payload,
            created_at
        )
        VALUES (
            :deviceId,
            :eventType,
            :severity,
            :payload::jsonb,
            now()
        )
    """;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final JPAQueryFactory queryFactory;

    // todo : 컬럼 추가 : current event

    @Override
    public void batchInsert(List<DeviceEvent> deviceEvents) {
        List<BeanPropertySqlParameterSource> list = deviceEvents.stream()
                .map(BeanPropertySqlParameterSource::new)
                .toList();

        jdbcTemplate.batchUpdate(SQL, list.toArray(SqlParameterSource[]::new));

    }

    @Override
    public List<DeviceEventResponse> findDeviceByRequest(String deviceId, EventType eventType, OffsetDateTime from,
                                                         OffsetDateTime to) {

        List<DeviceEvent> events = queryFactory
                .selectFrom(deviceEvent)
                .where(
                        robotIdEq(deviceId),
                        eventTypeEq(eventType),
                        createdAtGoe(from),
                        createdAtLt(to)
                )
                .orderBy(deviceEvent.createdAt.desc())
                .limit(100)
                .fetch();

        return events.stream()
                .map(DeviceEventResponse::of)
                .toList();

    }

    private BooleanExpression robotIdEq(String robotId) {
        return hasText(robotId)
                ? deviceEvent.deviceId.eq(robotId)
                : null;
    }

    private BooleanExpression eventTypeEq(EventType eventType) {
        return eventType != null
                ? deviceEvent.eventType.eq(eventType)
                : null;
    }

    private BooleanExpression createdAtGoe(OffsetDateTime from) {
        return from != null
                ? deviceEvent.createdAt.goe(from)
                : null;
    }

    private BooleanExpression createdAtLt(OffsetDateTime to) {
        return to != null
                ? deviceEvent.createdAt.lt(to)
                : null;
    }
}
