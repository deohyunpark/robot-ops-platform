package com.example.robotops.domain.request;

import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.micrometer.common.lang.Nullable;
import java.time.OffsetDateTime;
import org.springframework.ai.tool.annotation.ToolParam;

public record EventSearchRequest(

        @Nullable
        @ToolParam(
                required = false,
                description = "사용자가 지정하지 않으면 null"
        )
        @JsonPropertyDescription("""
                조회할 로봇 ID.
                지정하지 않으면 전체 로봇을 조회한다.
                """)
        String robotId,

        @Nullable
        @ToolParam(
                required = false,
                description = "사용자가 지정하지 않으면 null"
        )
        @JsonPropertyDescription("""
                조회할 이벤트
                사용자가 이벤트 종류를 지정하지 않으면 모든 이벤트를 조회한다.
                """)
        EventType eventType,

        @Nullable
        @ToolParam(
                required = false,
                description = "사용자가 지정하지 않으면 null"
        )
        @JsonPropertyDescription("""
                조회 시작 시각.
                ISO-8601 형식과 UTC 오프셋을 포함한다.

                예:
                - 2026-07-29T00:00:00+09:00
                - 2026-07-29T19:00:00+09:00

                사용자가 '오늘', '최근 1시간', '어제' 같은 표현을 사용하면
                한국 시간대인 UTC+09:00을 기준으로 변환한다.
                """)
        OffsetDateTime from,

        @Nullable
        @ToolParam(
                required = false,
                description = "사용자가 지정하지 않으면 null"
        )
        @JsonPropertyDescription("""
                조회 종료 시각.
                ISO-8601 형식과 UTC 오프셋을 포함한다.

                지정하지 않으면 현재 시각을 사용한다.
                한국 시간대인 UTC+09:00을 기준으로 한다.
                """)
        OffsetDateTime to,

        @Nullable
        @ToolParam(
                required = false,
                description = "사용자가 지정하지 않으면 null"
        )
        @JsonPropertyDescription("""
                이벤트 심각도.

                가능한 값:
                        -INFO,
                        -WARNING,
                        -CRITICAL

                지정하지 않으면 모든 심각도를 조회한다.
                """)
        Severity severity
) {
}
