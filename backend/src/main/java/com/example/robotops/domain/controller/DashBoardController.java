package com.example.robotops.domain.controller;


import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.domain.service.DashBoardService;
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

    @GetMapping("/utilization")
    public List<UtilizationResponse> getUtilization() {
        return dashBoardService.getUtilization();
    }
}
