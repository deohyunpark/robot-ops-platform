package com.example.robotops.infra.kafka.consumer;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.service.event.EventContext;
import com.example.robotops.domain.service.event.EventEngine;
import com.example.robotops.domain.service.event.RedisSnapshot;
import com.example.robotops.domain.service.event.RedisSnapshotBuilder;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisSyncService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * TODO: DeviceEventConsumer 테스트 스텁.
 *
 * <p>검증 포인트: TelemetryPayload JSON → EventEngine → sendDeviceEvent Kafka 호출
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceEventConsumer")
class DeviceEventConsumerTest {

    @Mock
    private JsonUtil jsonUtil;

    @Mock
    private RedisSnapshotBuilder redisSnapshotBuilder;

    @Mock
    private EventEngine eventEngine;

    @Mock
    private RedisSyncService redisSyncService;

    @Mock
    private KafkaProducer kafkaProducer;

    @InjectMocks
    private DeviceEventConsumer deviceEventConsumer;

    @Test
    @DisplayName("정상 Telemetry를 수신하면 탐지된 이벤트를 Kafka로 발행한다")
    void consume_validTelemetryPayload_publishesDetectedEvents() {

        // given
        String message = """
            {
              "robotId": "RBT-0001"
            }
            """;

        TelemetryPayload telemetryPayload =
                mock(TelemetryPayload.class);

        RedisSnapshot snapshot =
                mock(RedisSnapshot.class);

        DeviceEvent overheat =
                DeviceEvent.of(
                        "RBT-0001",
                        EventType.OVERHEAT,
                        Severity.CRITICAL,
                        Map.of()
                );

        DeviceEvent lowBattery =
                DeviceEvent.of(
                        "RBT-0001",
                        EventType.LOW_BATTERY,
                        Severity.WARNING,
                        Map.of()
                );

        when(
                jsonUtil.fromJson(
                        message,
                        TelemetryPayload.class
                )
        )
                .thenReturn(telemetryPayload);

        when(
                redisSnapshotBuilder.build(telemetryPayload)
        )
                .thenReturn(snapshot);

        when(eventEngine.process(any(EventContext.class)))
                .thenReturn(
                        List.of(
                                overheat,
                                lowBattery
                        )
                );

        // when
        deviceEventConsumer.consume(message);

        // then
        verify(jsonUtil)
                .fromJson(
                        message,
                        TelemetryPayload.class
                );

        verify(redisSnapshotBuilder)
                .build(telemetryPayload);

        verify(eventEngine)
                .process(any(EventContext.class));

        verify(kafkaProducer)
                .sendDeviceEvent(overheat);

        verify(kafkaProducer)
                .sendDeviceEvent(lowBattery);
    }

    @Test
    @DisplayName("잘못된 JSON을 수신하면 MESSAGE_DESERIALIZATION_FAILED 예외가 발생한다")
    void consume_invalidJson_throwsException() {

        // given
        String invalidMessage =
                "{ invalid-json }";

        when(
                jsonUtil.fromJson(
                        invalidMessage,
                        TelemetryPayload.class
                )
        )
                .thenThrow(
                        new RobotOpsException(
                                ErrorCode.MESSAGE_DESERIALIZATION_FAILED
                        )
                );

        // when & then
        assertThatThrownBy(
                () -> deviceEventConsumer.consume(invalidMessage)
        )
                .isInstanceOf(RobotOpsException.class)
                .satisfies(exception -> {

                    RobotOpsException robotOpsException =
                            (RobotOpsException) exception;

                    assertThat(
                            robotOpsException.getErrorCode()
                    )
                            .isEqualTo(
                                    ErrorCode.MESSAGE_DESERIALIZATION_FAILED
                            );
                });

        verifyNoInteractions(
                redisSnapshotBuilder,
                eventEngine,
                redisSyncService,
                kafkaProducer
        );
    }
}
