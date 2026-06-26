package com.example.robotops.domain.service;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.DeviceIdResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeviceStateService {

    private final DeviceStateRepository deviceStateRepository;

    public List<DeviceIdResponse> getAllDeviceList() {
        return deviceStateRepository.findAllDeviceId().stream()
                .map(DeviceIdResponse::of).toList();
    }
}
