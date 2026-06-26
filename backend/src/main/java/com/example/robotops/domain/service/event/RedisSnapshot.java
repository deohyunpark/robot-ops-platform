package com.example.robotops.domain.service.event;

import java.util.List;
import lombok.Builder;

@Builder
public record RedisSnapshot (
        Double lastSpeed,
        Double lastBattery,
        Integer countSpeed,
        Integer countBattery,
        List<String> cpuWindow,
        List<String> tempWindow
) {
}
