package com.example.robotops.domain.repository;

import static com.example.robotops.domain.entity.QDeviceEvent.deviceEvent;
import static org.springframework.util.StringUtils.hasText;

import com.example.robotops.domain.deviceStateType.EventStatus;
import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.BeanPropertySqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;


@Repository
@RequiredArgsConstructor
public class DeviceEventRepositoryCustomImpl implements DeviceEventRepositoryCustom {


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

    @Override
    public List<DeviceEvent> findAllUnresolvedDeviceEvents(String deviceId) {
        return queryFactory.selectFrom(deviceEvent)
                .where(
                        robotIdEq(deviceId),
                        unresolved()
                )
                .orderBy(deviceEvent.createdAt.desc())
                .limit(100)
                .fetch();

    }

    @Override
    public List<DeviceEvent> findAllDeviceEvents(String robotId) {
        return queryFactory.selectFrom(deviceEvent)
                .where(
                        robotIdEq(robotId)
                )
                .orderBy(deviceEvent.createdAt.desc())
                .limit(15)
                .fetch();
    }

    // critical 이 하나라도 있는지
    @Override
    public boolean existsOpenCritical(String deviceId) {
        Integer result = queryFactory
                .selectOne()
                .from(deviceEvent)
                .where(
                        deviceEvent.deviceId.eq(deviceId),
                        deviceEvent.eventStatus.eq(EventStatus.OPEN),
                        deviceEvent.severity.eq(Severity.CRITICAL)
                )
                .fetchFirst();

        return result != null;
    }

    // 가장 최근 이벤트 시간이 언제인지
    @Override
    public Optional<OffsetDateTime> findLatestOpenEventAt(String deviceId) {

        OffsetDateTime latestEventAt = queryFactory
                .select(deviceEvent.createdAt.max())
                .from(deviceEvent)
                .where(
                        deviceEvent.deviceId.eq(deviceId),
                        deviceEvent.eventStatus.eq(EventStatus.OPEN)
                )
                .fetchOne();

        return Optional.ofNullable(latestEventAt);
    }

    @Override
    public List<DeviceEventResponse> findTodayEvents(OffsetDateTime from, OffsetDateTime to) {
        List<DeviceEvent> deviceEvents = queryFactory.selectFrom(deviceEvent)
                .where(
                        createdAtGoe(from),
                        createdAtLt(to)
                )
                .fetch();

        return deviceEvents.stream().map(DeviceEventResponse::of).toList();
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

    private BooleanExpression unresolved() {
        return deviceEvent.eventStatus.in(
                EventStatus.OPEN,
                EventStatus.ACKNOWLEDGED
        );
    }



}
