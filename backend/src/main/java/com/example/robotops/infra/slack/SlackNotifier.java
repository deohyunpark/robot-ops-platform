package com.example.robotops.infra.slack;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient.Builder;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlackNotifier {

    private final Builder webClientBuilder;
    private final SlackProperties slackProperties;

    public void sendAsync(String message) {
        if (!slackProperties.isEnabled()) {
            return;
        }

        webClientBuilder.build()
                .post()
                .uri(slackProperties.getWebhookUrl())
                .bodyValue(Map.of("text", message))
                .retrieve()
                .toBodilessEntity()
                .doOnError(error -> log.warn("Slack notification failed: {}", error.getMessage()))
                .subscribe();
    }
}
