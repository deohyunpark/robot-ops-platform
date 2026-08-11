package com.example.robotops.domain.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.robotops.domain.enums.EventStatus;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.domain.service.AiAnalysisService;
import com.example.robotops.domain.service.DashBoardService;
import com.example.robotops.domain.service.DeviceEventService;
import com.example.robotops.domain.service.DeviceStateService;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * TODO: DashBoardController 슬라이스 테스트 스텁.
 *
 * <p>권장: @WebMvcTest(DashBoardController.class) + @MockBean Service
 *
 * <p>Grafana: http_server_requests_seconds{uri="/v1/dashboard/all-events"} 와
 * 통합 테스트 응답 시간 상한(assert) 으로 회귀 방지
 */
@WebMvcTest(DashBoardController.class)
@DisplayName("DashBoardController")
class DashBoardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DeviceEventService deviceEventService;

    @MockitoBean
    private DashBoardService dashBoardService;

    @MockitoBean
    private DeviceStateService deviceStateService;

    @MockitoBean
    private AiAnalysisService aiAnalysisService;

    @Test
    @DisplayName("전체 이벤트 조회 시 200과 JSON 배열을 반환한다")
    void getAllEvents_returns200AndJsonArray() throws Exception {

        // given
        RedisEventResponse response1 = RedisEventResponse.of(
                "RBT-0001",
                "OVERHEAT",
                "CRITICAL",
                OffsetDateTime.parse(
                        "2026-08-11T12:00:00+09:00"
                )
        );

        RedisEventResponse response2 = RedisEventResponse.of(
                "RBT-0002",
                "OFFLINE",
                "CRITICAL",
                OffsetDateTime.parse(
                        "2026-08-11T12:10:00+09:00"
                )
        );


        when(deviceEventService.getAllDeviceEvents())
                .thenReturn(List.of(response1,response2));

        // when & then
        mockMvc.perform(
                        get("/v1/dashboard/all-events")
                )
                .andExpect(status().isOk())
                .andExpect(
                        content().contentType(
                                MediaType.APPLICATION_JSON
                        )
                )
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))

                .andExpect(
                        jsonPath("$[0].deviceId")
                                .value("RBT-0001")
                )
                .andExpect(
                        jsonPath("$[0].eventName")
                                .value("OVERHEAT")
                )
                .andExpect(
                        jsonPath("$[1].deviceId")
                                .value("RBT-0002")
                )
                .andExpect(
                        jsonPath("$[1].eventName")
                                .value("OFFLINE")
                );
    }

    @Test
    @DisplayName("장비별 이벤트 조회 시 상태와 해결 시간을 반환한다")
    void getDeviceEventsByRobotId_returnsEventsWithStatus()
            throws Exception {

        // given
        String deviceId = "RBT-0001";

        OffsetDateTime resolvedAt =
                OffsetDateTime.parse(
                        "2026-08-11T13:00:00+09:00"
                );

        DeviceEventResponse event =
                DeviceEventResponse.builder()
                        .id(1L)
                        .deviceId(deviceId)
                        .eventType(EventType.COLLISION)
                        .severity(Severity.CRITICAL)
                        .eventStatus(EventStatus.RESOLVED)
                        .createdAt(
                                OffsetDateTime.parse(
                                        "2026-08-11T12:00:00+09:00"
                                )
                        )
                        .resolvedAt(resolvedAt)
                        .build();

        when(
                deviceEventService.getDeviceEventsByRobotId(deviceId)
        )
                .thenReturn(List.of(event));

        // when & then
        mockMvc.perform(
                        get(
                                "/v1/dashboard/events/{deviceId}",
                                deviceId
                        )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))

                .andExpect(
                        jsonPath("$[0].deviceId")
                                .value("RBT-0001")
                )
                .andExpect(
                        jsonPath("$[0].eventType")
                                .value("COLLISION")
                )
                .andExpect(
                        jsonPath("$[0].eventStatus")
                                .value("RESOLVED")
                )
                .andExpect(
                        jsonPath("$[0].resolvedAt")
                                .exists()
                );
    }
}
