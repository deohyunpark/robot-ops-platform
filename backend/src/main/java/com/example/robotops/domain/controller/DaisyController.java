package com.example.robotops.domain.controller;


import com.example.robotops.domain.request.DaisyChatRequest;
import com.example.robotops.domain.response.DaisyChatResponse;
import com.example.robotops.domain.service.DailyReportFacade;
import com.example.robotops.domain.service.DaisyAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/daisy")
public class DaisyController {

    private final DaisyAssistantService das;
    private final DailyReportFacade dailyReportFacade;

    @PostMapping("/chat")
    public DaisyChatResponse chat(@RequestBody DaisyChatRequest request
    ) {
        String answer = das.askEvent(request.request());
        System.out.println("answer: " + answer);
        return DaisyChatResponse.of(answer);
    }


    //PDF 생성
    @PostMapping(
            value = "/daily/report",
            produces = MediaType.APPLICATION_PDF_VALUE
    )
    public ResponseEntity<byte[]> createDailyReport() {

        byte[] pdf =
                dailyReportFacade.createPdf();


        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=robotops-daily-report.pdf"
                )
                .contentType(
                        MediaType.APPLICATION_PDF
                )
                .body(pdf);
    }
}
