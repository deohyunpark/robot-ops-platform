package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.response.DeviceInsightResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RiskCalculator {

    public Integer calculate(List<DeviceInsightResponse> request) {

        return request.stream()
                .mapToInt(DeviceInsightResponse::score)
                .sum();

    }


}
