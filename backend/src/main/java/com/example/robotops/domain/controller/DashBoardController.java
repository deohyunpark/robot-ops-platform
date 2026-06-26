package com.example.robotops.domain.controller;


import com.example.robotops.domain.response.DeviceIdResponse;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.domain.service.DashBoardService;
import com.example.robotops.domain.service.DeviceEventService;
import com.example.robotops.domain.service.DeviceStateService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/dashboard")
public class DashBoardController {

    private final DashBoardService dashBoardService;
    private final DeviceEventService deviceEventService;
    private final DeviceStateService deviceStateService;

    @GetMapping("/utilization")
    public List<UtilizationResponse> getUtilization() {
        return dashBoardService.getUtilization();
    }

    @GetMapping("/offline")
    public List<RedisEventResponse> getOffline() {
        return deviceEventService.getOffLineDevices();
    }

    @GetMapping("/all-events")
    public List<RedisEventResponse> getAllEvents() {
        return deviceEventService.getAllDeviceEvents();
    }

    @GetMapping("/device-list")
    public List<DeviceIdResponse> getAllDevices() {
        return deviceStateService.getAllDeviceList();
    }


}
