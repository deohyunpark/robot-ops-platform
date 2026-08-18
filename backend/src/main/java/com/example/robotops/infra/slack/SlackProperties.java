package com.example.robotops.infra.slack;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "slack")
@Getter
@Setter
public class SlackProperties {

    private String webhookUrl = "";

    public boolean isEnabled() {
        return webhookUrl != null && !webhookUrl.isBlank();
    }
}
