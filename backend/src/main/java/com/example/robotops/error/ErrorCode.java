package com.example.robotops.error;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_REQUEST(
            HttpStatus.BAD_REQUEST,
            "COMMON_001",
            "요청 값이 올바르지 않습니다.",
            false
    ),

    MQTT_PARSE_FAILED(
            HttpStatus.BAD_REQUEST,
            "MQTT_001",
            "MQTT 메시지 파싱에 실패했습니다.",
            false
    ),

    KAFKA_PUBLISH_FAILED(
            HttpStatus.SERVICE_UNAVAILABLE,
            "KAFKA_001",
            "Kafka 메시지 발행에 실패했습니다.",
            true
    ),

    REDIS_OPERATION_FAILED(
            HttpStatus.SERVICE_UNAVAILABLE,
            "REDIS_001",
            "Redis 처리에 실패했습니다.",
            true
    ),

    OPENAI_TEMPORARY_ERROR(
            HttpStatus.SERVICE_UNAVAILABLE,
            "AI_001",
            "AI 서비스에 일시적인 오류가 발생했습니다.",
            true
    ),

    OPENAI_INVALID_REQUEST(
            HttpStatus.BAD_REQUEST,
            "AI_002",
            "AI 요청 형식이 올바르지 않습니다.",
            false
    ),

    EVENT_QUERY_FAILED(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "EVENT_001",
            "이벤트 조회에 실패했습니다.",
            true
    ),

    MESSAGE_SERIALIZATION_FAILED(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "MSG_001",
            "메시지 직렬화에 실패했습니다.",
            false
    ),

    MESSAGE_DESERIALIZATION_FAILED(
            HttpStatus.BAD_REQUEST,
            "MSG_002",
            "메시지 역직렬화에 실패했습니다.",
            false
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    // Kafka/OpenAI 재시도 정책을 판단할 때 사용
    private final boolean retryable;
}
