package com.example.robotops.domain.repository;

import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.domain.request.DeviceStateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.BeanPropertySqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@RequiredArgsConstructor
@Repository
public class DeviceStateUpsertRepository {

    private final NamedParameterJdbcTemplate namedJdbcTemplate;

    public void upsert(DeviceStateRequest request) {
        String sql = """
        insert into device_state 
        (       
              device_id,
              device_type,
              site_id,
              online,
              mode,
              mission,
              battery_pct,
              speed_mps,
              pos_x,
              pos_y,
              theta,
              map_id, 
              cpu_pct,
              mem_pct,
              temp_c,
              estop,
              bumper,
              obstacle,
              error_code, 
              last_seq,
              last_seen_at,
              updated_at
        )
        values 
        (
            :deviceId,
            'ROBOT',
            :siteId,
            :online,
            :mode,
            :mission,
            :batteryPct,
            :speedMps,
            :posX,
            :posY,
            :theta,
            :mapId,
            :cpuPct,
            :memPct,
            :tempC,
            :estop,
            :bumper,
            :obstacle,
            :errorCode,
            :lastSeq,
            CAST(:lastSeenAt AS timestamptz),
            :updatedAt
        )
        on conflict (device_type, device_id)
        do update set
            online = excluded.online,
            mode = excluded.mode,
            mission = excluded.mission,
            battery_pct = excluded.battery_pct,
            speed_mps = excluded.speed_mps,
            pos_x = excluded.pos_x,
            pos_y = excluded.pos_y,
            theta = excluded.theta,
            map_id = excluded.map_id,
            cpu_pct = excluded.cpu_pct,
            mem_pct = excluded.mem_pct,
            temp_c = excluded.temp_c,
            estop = excluded.estop,
            bumper = excluded.bumper,
            obstacle = excluded.obstacle,
            error_code = excluded.error_code,
            last_seq = excluded.last_seq,
            last_seen_at = excluded.last_seen_at,
            updated_at = now()
        """;

        namedJdbcTemplate.update(sql, new BeanPropertySqlParameterSource(request));

    }
}
