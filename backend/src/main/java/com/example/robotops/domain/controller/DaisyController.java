package com.example.robotops.domain.controller;


import com.example.robotops.domain.request.DaisyChatRequest;
import com.example.robotops.domain.response.DaisyChatResponse;
import com.example.robotops.domain.service.DaisyAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/daisy")
public class DaisyController {

    private final DaisyAssistantService das;

    @PostMapping("/chat")
    public DaisyChatResponse chat(@RequestBody DaisyChatRequest request
    ) {
        String answer = das.ask(request.request());
        System.out.println("answer: " + answer);
        return DaisyChatResponse.of(answer);
    }
}
