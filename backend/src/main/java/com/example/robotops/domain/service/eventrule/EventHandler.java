package com.example.robotops.domain.service.eventrule;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public interface EventHandler {

    List<DeviceEvent> evaluate(TelemetryPayload telemetryPayloads);

}
