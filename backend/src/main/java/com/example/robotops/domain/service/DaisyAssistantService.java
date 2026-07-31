package com.example.robotops.domain.service;


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

    public String ask(String message) {

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
}
