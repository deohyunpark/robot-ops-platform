package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.service.event.EventContext;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InsightEngine {

    private final List<InsightHandler> handlers;

    public List<DeviceInsightResponse> process(EventContext ctx) {
        return handlers.stream()
                .map(h -> h.evaluate(ctx))
                .flatMap(Optional::stream)
                .toList();
    }
}
