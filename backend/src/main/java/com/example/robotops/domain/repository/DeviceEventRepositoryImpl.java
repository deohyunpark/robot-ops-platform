package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.DeviceEvent;
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

    // todo : 컬럼 추가 : current event

    @Override
    public void batchInsert(List<DeviceEvent> deviceEvents) {
        List<BeanPropertySqlParameterSource> list = deviceEvents.stream()
                .map(BeanPropertySqlParameterSource::new)
                .toList();

        jdbcTemplate.batchUpdate(SQL, list.toArray(SqlParameterSource[]::new));

    }
}
