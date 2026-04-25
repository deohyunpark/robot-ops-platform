package com.example.robotops.domain.service.eventrule;

import com.example.robotops.domain.entity.DeviceEvent;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventEngine {

    private final List<EventHandler> handlers;

    public List<DeviceEvent> process(EventContext ctx) {
        return handlers.stream()
                .map(h -> h.evaluate(ctx))
                .flatMap(Optional::stream)
                .toList();
    }
}
