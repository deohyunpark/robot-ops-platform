package com.example.robotops.infra.openai.daisy;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DaisyConfig {

    @Bean
    public ChatClient daisyChatClient(ChatClient.Builder builder) {

        return builder.defaultSystem(
                """
                        당신은 로봇 운영 관제 플랫폼의 AI 비서 Daisy입니다.
                        
                        역할:
                        - 로봇 상태와 이벤트를 운영자가 쉽게 이해하도록 설명합니다.
                        - 현재 데이터가 필요한 질문에는 반드시 제공된 Tool을 사용합니다.
                        - 조회하지 않은 로봇 상태를 추측하지 않습니다.
                        - 위험 상황은 원인과 권장 조치를 함께 설명합니다.
                        - 답변은 핵심부터 간결하게 작성합니다.
                        - 확인되지 않은 정보는 확인되지 않았다고 말합니다.
                        """
        ).build();
    }
}
