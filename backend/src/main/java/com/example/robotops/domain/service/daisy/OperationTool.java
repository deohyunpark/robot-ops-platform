package com.example.robotops.domain.service.daisy;


import com.example.robotops.domain.response.PriorityDeviceResponse;
import com.example.robotops.domain.service.DevicePriorityService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OperationTool {

    private final DevicePriorityService devicePriorityService;

    @Tool(description = """
            현재 운영 중인 로봇 중 우선적으로 확인해야 할 장비를 조회한다.

            우선순위는 다음 운영 정책을 기반으로 결정된다.
            1. 해결되지 않은 CRITICAL 이벤트가 존재하는 장비
            2. 최신 총 Risk Score가 높은 장비
            3. 최근 이벤트 발생 시간이 최신인 장비

            다음과 같은 질문에서 사용한다.
            - 가장 먼저 확인해야 할 장비가 어디인가요?
            - 위험도가 높은 장비를 먼저 보여주세요.
            - 지금 어떤 로봇부터 점검해야 하나요?
            - 운영자가 우선 대응해야 할 장비는 무엇인가요?

            반환된 순서는 이미 운영 우선순위에 따라 정렬되어 있으므로
            임의로 순서를 변경하지 않는다.
            """)
    public List<PriorityDeviceResponse> getPriorityDevices() {

        log.info("[DAISY TOOL] getPriorityDevices called");

        List<PriorityDeviceResponse> result =
                devicePriorityService.getPriorityDevices();

        log.info(
                "[DAISY TOOL] getPriorityDevices result={}",
                result
        );

        return result;
    }
}
