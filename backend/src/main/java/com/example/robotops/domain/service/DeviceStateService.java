package com.example.robotops.domain.service;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.DeviceIdResponse;
import com.example.robotops.domain.response.DeviceStateResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeviceStateService {

    private final DeviceStateRepository deviceStateRepository;

    public List<DeviceIdResponse> getAllDeviceIdList() {
        return deviceStateRepository.findAllDeviceId().stream()
                .map(DeviceIdResponse::of).toList();
    }

    public List<DeviceStateResponse> getAllDeviceStateList() {
        return deviceStateRepository.findAll().stream().map(DeviceStateResponse::of).toList();
    }
}
