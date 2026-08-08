package com.example.robotops.domain.service.daisy;

import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.request.EventSearchRequest;
import com.example.robotops.domain.response.DeviceEventResponse;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventTool {


    private final DeviceEventRepository deviceEventRepository;
    /**
     *
     * 오늘 발생한 장애를 보여주세요.
     * 최근 1시간 이벤트만 보여주세요.
     * 충돌(COLLISION) 이벤트만 조회해주세요.
     * 비상정지(E-STOP)가 발생한 장비는?
     * 장애물이 가장 많이 감지된 로봇은?
     * 최근 OFFLINE 발생 횟수는?
     * 오늘 가장 많이 장애가 난 장비는?
     * 같은 장애가 반복되는 장비가 있나요?
     * 가장 심각한 이벤트를 보여주세요.
     *
    */

    @Tool(description = """
                        장애/에러 및 이벤트 이력을 조회한다.
                        
                        다음과 같은 질문에 사용한다.
                        
                        - 오늘 발생한 장애/에러/이벤트를 보여주세요.
                        - 최근 1시간 장애/에러/이벤트만 보여주세요.
                        - 충돌(COLLISION) 장애/에러/이벤트만 조회해주세요.
                        - 최근 OFFLINE 발생 횟수는?
                        - 최근 OVERHEAT 장애/에러/이벤트를 보여주세요.
                        - 특정 기간의 장애/에러/이벤트를 조회해주세요.
                        - RBT-0001 최근 장애/에러/이벤트를 보여주세요.
                        
                        시간, 로봇 ID, 이벤트 종류를 조건으로 이벤트를 조회한다.
                        
                        반복 장애 분석이나 통계가 필요한 경우에는 getEventStatistics를 사용한다.
                        """)
    @Transactional(readOnly = true)
    public List<DeviceEventResponse> getRecentRobotEvents(EventSearchRequest request) {
        OffsetDateTime to = Optional.ofNullable(request.to())
                .orElse(OffsetDateTime.now(ZoneOffset.ofHours(9)));

        OffsetDateTime from = Optional.ofNullable(request.from())
                .orElse(to.minusHours(24));

        log.info(
                "[DAISY TOOL] getRecentRobotEvents called. deviceId={}",
                request.robotId()
        );

        List<DeviceEventResponse> result = deviceEventRepository.findDeviceByRequest(request.robotId(),
                request.eventType(), from, to);

        log.info(
                "[DAISY TOOL] getDeviceSummary result={}",
                result
        );

        return result;
    }


}
