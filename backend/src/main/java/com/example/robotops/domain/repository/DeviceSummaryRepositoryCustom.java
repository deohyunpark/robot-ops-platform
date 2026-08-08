package com.example.robotops.domain.repository;

import com.example.robotops.domain.response.DeviceSummaryResponse;

public interface DeviceSummaryRepositoryCustom {

    DeviceSummaryResponse getDeviceSummary(String deviceId);
}
