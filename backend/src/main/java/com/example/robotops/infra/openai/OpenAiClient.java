package com.example.robotops.infra.openai;

import com.example.robotops.domain.response.InsightFeedResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient.Builder;
import reactor.core.publisher.Mono;


@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiClient {

    private final Builder webClientBuilder;
    private final OpenAiProperties openAiProperties;
    private final PromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;

    public AiSummaryResponse request(InsightFeedResponse response) {

        String prompt = promptBuilder.build(response);

        ChatRequest request = new ChatRequest(
                openAiProperties.getModel(),
                List.of(
                        new Message(
                                "system",
                                """
                                너는 로봇 운영 관제 전문가다.
                                운영자가 이해하기 쉽게 설명한다.
                                과장하지 않는다.
    
                                반드시 JSON 객체만 반환한다.
                                설명이나 마크다운 코드 블록은 출력하지 않는다.
    
                                반드시 아래 구조를 따른다.
    
                                {
                                  "robotId": "...",
                                  "level": "...",
                                  "currentSituation": "...",
                                  "possibleCause": "...",
                                  "recommendation": "..."
                                }
    
                                robotId은 입력값을 그대로 사용한다.
                                level은 입력값의 deviceRiskResponse의 risklevel의 enum을 그대로 사용한다.
                                currentSituation, possibleCause, recommendation은
                                각각 한 문장 이내로 작성한다.
                                """
                        ),
                        new Message("user", prompt)
                )
        );

        ChatResponse chatResponse = webClientBuilder.build()
                .post()
                .uri("https://api.openai.com/v1/chat/completions")
                .header(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + openAiProperties.getApiKey()
                )
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(
                        HttpStatusCode::isError,
                        clientResponse -> clientResponse
                                .bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("OpenAI Error: {}", body);
                                    return Mono.error(
                                            new IllegalStateException(
                                                    "OpenAI API 호출 실패"
                                            )
                                    );
                                })
                )
                .bodyToMono(ChatResponse.class)
                .block();

        if (chatResponse == null
                || chatResponse.choices() == null
                || chatResponse.choices().isEmpty()
                || chatResponse.choices().get(0).message() == null
                || chatResponse.choices().get(0).message().content() == null) {

            throw new IllegalStateException("OpenAI 응답이 비어 있습니다.");
        }

        String content = chatResponse.choices()
                .get(0)
                .message()
                .content();

        try {
            return objectMapper.readValue(
                    content,
                    AiSummaryResponse.class
            );
        } catch (JsonProcessingException e) {
            log.error("OpenAI JSON 파싱 실패: {}", content, e);
            throw new IllegalStateException(
                    "OpenAI 응답 JSON 변환 실패",
                    e
            );
        }
    }
}