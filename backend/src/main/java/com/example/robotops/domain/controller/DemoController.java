package com.example.robotops.domain.controller;


import com.example.robotops.domain.response.DemoSessionResponse;
import com.example.robotops.domain.response.DemoStatusResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/demo")
public class DemoController {

    private final DemoService demoService;

    @PostMapping("/start")
    public DemoSessionResponse startDemo() {
        log.info("Starting demo");
        return demoService.start(Duration.ofMinutes(10));
    }

    @PostMapping("/stop")
    public void stopDemo() {
        demoService.stop();
    }

    @GetMapping("/status")
    public DemoStatusResponse getStatus() {
        return demoService.getStatus();
    }

}
