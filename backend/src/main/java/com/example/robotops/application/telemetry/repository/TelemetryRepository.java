package com.example.robotops.application.telemetry.repository;


import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.BeanPropertySqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@RequiredArgsConstructor
@Repository
public class TelemetryRepository {

    private final NamedParameterJdbcTemplate namedJdbcTemplate;

    public void save(TelemetryRawRequest request) {
        String sql = """
        insert into telemetry_raw
        (
            ts,
            site_id,
            device_type,
            device_id,
            msg_id,
            battery_pct,
            temp_c,
            raw_json
        )
        values
        (
            CAST(:ts AS timestamptz),
            :siteId,
            'ROBOT',
            :deviceId,
            :msgId,
            :battery,
            :temp,
            CAST(:rawJson AS jsonb)
        )
    """;

        namedJdbcTemplate.update(sql, new BeanPropertySqlParameterSource(request));

    }
}
