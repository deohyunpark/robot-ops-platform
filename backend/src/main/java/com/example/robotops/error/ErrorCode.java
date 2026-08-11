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

    MQTT_NOT_CONNECTED(
            HttpStatus.SERVICE_UNAVAILABLE,
            "MQTT_002",
            "MQTT 브로커에 연결되어 있지 않습니다.",
            false
    ),

    MQTT_PUBLISH_FAILED(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "MQTT_003",
            "MQTT 메시지 발행에 실패했습니다.",
            false
    ),

    MQTT_CONNECTION_FAILED(
            HttpStatus.SERVICE_UNAVAILABLE,
            "MQTT_004",
            "MQTT 브로커 연결에 실패했습니다.",
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

    EVENT_TYPE_NOT_FOUND(
            HttpStatus.BAD_REQUEST,
            "EVENT_002",
            "존재하지 않는 이벤트 타입입니다.",
            false
    ),

    EVENT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "EVENT_003",
            "이벤트를 찾을 수 없습니다.",
            false
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
    ),

    DEVICE_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "DEVICE_001",
            "디바이스를 찾을 수 없습니다.",
            false
    ),

    INSIGHT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "INSIGHT_001",
            "저장된 피드를 찾을 수 없습니다.",
            false
    ),

    PDF_GENERATION_FAILED(
            HttpStatus.SERVICE_UNAVAILABLE,
            "PDF_GENERATE_001",
            "PDF 발행에 실패했습니다.",
            false
    ),
    INVALID_EVENT_STATUS(
            HttpStatus.CONFLICT,
            "INVALID_EVENT_STATUS_001",
            "현재 이벤트 상태에서는 해당 작업을 수행할 수 없습니다",
            false),

    EVENT_ACTION_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "EVENT_ACTION_001",
            "이벤트액션을 찾을 수 없습니다.",
            false
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    // Kafka/OpenAI 재시도 정책을 판단할 때 사용
    private final boolean retryable;
}
