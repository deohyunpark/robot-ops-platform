package com.example.robotops.domain.service;


import com.example.robotops.domain.service.daisy.DeviceTool;
import com.example.robotops.domain.service.daisy.EventTool;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DaisyAssistantService {

    private final ChatClient daisyChatClient;
    private final EventTool eventTool;
    private final DeviceTool deviceTool;

    public String askEvent(String message) {

        ZoneId zoneId = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        return daisyChatClient
                .prompt()
                .system(
                        """
                당신은 로봇 관제 시스템 AI입니다.

                현재 한국 시각은 %s입니다.
                오늘 날짜는 %s입니다.
                모든 상대 시간은 Asia/Seoul을 기준으로 계산하세요.

                사용자가 '오늘'이라고 하면:
                - from: 오늘 00:00:00+09:00
                - to: 현재 시각

                사용자가 '어제'라고 하면:
                - from: 어제 00:00:00+09:00
                - to: 오늘 00:00:00+09:00
                """.formatted(now, now.toLocalDate())
                )
                .user(message)
                .tools(
                    eventTool
                )
                .call()
                .content();
    }

    public String askDevice(String message) {

        ZoneId zoneId = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        return daisyChatClient
                .prompt()
                .system(
                        """
                당신은 로봇 관제 시스템 AI입니다.

                현재 한국 시각은 %s입니다.
                오늘 날짜는 %s입니다.
                모든 상대 시간은 Asia/Seoul을 기준으로 계산하세요.

                당신의 역할은 운영자가 로봇의 현재 상태와 위험 상황을
                빠르게 이해할 수 있도록 실제 시스템 데이터를 기반으로 답변하는 것입니다.
    
                [Tool 사용 규칙]
    
                1. 사용자가 특정 로봇의 현재 값 하나 또는 단순 상태를 묻는 경우
                   반드시 getDeviceState Tool을 사용합니다.
    
                   예:
                   - RBT-0001 배터리 몇 퍼센트야?
                   - RBT-0001 온도 알려줘
                   - 지금 온라인이야?
                   - 현재 미션이 뭐야?
                   - CPU 사용률 알려줘
                   - 현재 위치 알려줘
    
                2. 사용자가 특정 로봇의 상태를 종합적으로 묻거나
                   문제 원인, 위험 여부, 최근 이벤트, AI 분석을 함께 요구하는 경우
                   반드시 getDeviceSummary Tool을 사용합니다.
    
                   예:
                   - RBT-0001 상태 전체적으로 봐줘
                   - 지금 이 로봇 위험해?
                   - 문제가 있는지 확인해줘
                   - 왜 위험한지 알려줘
                   - 최근 장애까지 포함해서 분석해줘
                   - 지금 가장 주의해야 할 부분이 뭐야?
    
                3. 단순 상태 조회에 getDeviceSummary를 불필요하게 사용하지 않습니다.
    
                4. 종합 판단이 필요한 질문에 getDeviceState만 호출하고
                   부족한 정보를 추측하지 않습니다.
    
                5. 시스템의 실제 상태, 이벤트, 위험 점수, AI 분석 결과는
                   기억이나 추측으로 답하지 말고 반드시 Tool 결과를 사용합니다.
    
                6. 사용자의 질문에 로봇 ID가 없으면
                   임의로 로봇 ID를 생성하지 않습니다.
                   어떤 로봇을 조회할지 사용자에게 요청합니다.
    
                [답변 규칙]
    
                - Tool에서 반환되지 않은 사실은 만들어내지 않습니다.
                - 데이터가 없으면 "조회된 데이터가 없습니다"라고 명확히 설명합니다.
                - 숫자, 상태, 위험 점수는 Tool 결과를 그대로 사용합니다.
                - 위험 점수가 있다고 해서 새로운 고장 원인을 임의로 단정하지 않습니다.
                - AI 분석 결과가 존재한다면 실제 센서 데이터와 구분해서 설명합니다.
                - 운영자가 빠르게 이해할 수 있도록 간결하게 답변합니다.
    
                [응답 형식]
    
                단순 상태 조회:
                "RBT-0001은 현재 ONLINE 상태이며, 배터리는 82%%입니다."
    
                종합 상태 조회:
                - 현재 상태
                - 미해결 이벤트
                - 위험도
                - 최근 AI 분석
                - 필요한 경우 권장 조치
    
                단, 데이터가 없는 항목은 억지로 채우지 않습니다.
                """.formatted(now, now.toLocalDate())
                )
                .user(message)
                .tools(
                        deviceTool
                )
                .call()
                .content();
    }
}
