package com.example.robotops.infra.redis;


import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.domain.service.DashBoardService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UtilizationRedisReadTest {

    @Mock
    private RedisService redisService;

    @Mock
    private DeviceStateRepository deviceStateRepository;

    @InjectMocks
    private DashBoardService dashBoardService;

    @Test
    @DisplayName("장비별 가동률 조회 시 Redis를 장비 수만큼 호출한다")
    void getUtilization_before_callsRedisPerDevice() {

        // given
        List<String> deviceIds =
                List.of(
                        "RBT-0001",
                        "RBT-0002",
                        "RBT-0003"
                );

        when(deviceStateRepository.findAllDeviceId())
                .thenReturn(deviceIds);

        when(redisService.currentBucketStart())
                .thenReturn(OffsetDateTime.parse(
                        "2026-08-15T15:00:00+09:00"
                ));

        when(redisService.getUtilizationValueByDevice(anyString()))
                .thenReturn(
                        Map.of(
                                "totalSeconds", "100",
                                "activeSeconds", "80"
                        )
                );

        // when
        List<UtilizationResponse> utilization = dashBoardService.getUtilizationDeprecated();

        // then
        verify(redisService, times(3))
                .getUtilizationValueByDevice(anyString());

        assertThat(utilization).hasSize(3);
    }

    @Test
    @DisplayName("장비별 가동률 조회 시 Redis를 한번 호출한다")
    void getUtilization_after_callsRedisPerDevice() {

        // given
        List<String> deviceIds =
                List.of(
                        "RBT-0001",
                        "RBT-0002",
                        "RBT-0003"
                );

        Map<String, Map<String, String>> result = Map.of(
                "RBT-0001", Map.of(
                        "totalSeconds", "100",
                        "activeSeconds", "80"
                ),
                "RBT-0002", Map.of(
                        "totalSeconds", "100",
                        "activeSeconds", "80"
                ),
                "RBT-0003", Map.of(
                        "totalSeconds", "100",
                        "activeSeconds", "80"
                )
        );

        when(deviceStateRepository.findAllDeviceId())
                .thenReturn(deviceIds);

        when(redisService.currentBucketStart())
                .thenReturn(OffsetDateTime.parse(
                        "2026-08-15T15:00:00+09:00"
                ));

        when(redisService.getUtilizationValuesByDevices(deviceIds))
                .thenReturn(result);

        // when
        List<UtilizationResponse> utilization = dashBoardService.getUtilization();

        // then
        verify(redisService, times(1))
                .getUtilizationValuesByDevices(deviceIds);

        assertThat(utilization).hasSize(3);
    }

}
