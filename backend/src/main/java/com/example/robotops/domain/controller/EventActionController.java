package com.example.robotops.domain.controller;


import com.example.robotops.domain.request.AckRequest;
import com.example.robotops.domain.request.CheckListSaveRequest;
import com.example.robotops.domain.response.AckResponse;
import com.example.robotops.domain.service.EventActionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/events")
public class EventActionController {

    private final EventActionService eventActionService;

    // 담당자 저장
    @PostMapping("/ack")
    public ResponseEntity<AckResponse> acknowledgeEvent(@RequestBody AckRequest ackRequest) {
        return ResponseEntity.ok(eventActionService.acknowledgeEvent(ackRequest));
    }
    // 조회
    @GetMapping("/{eventId}/action")
    public ResponseEntity<AckResponse> getEventAction(
            @PathVariable Long eventId
    ) {
        return ResponseEntity.ok(
                eventActionService.getEventAction(eventId)
        );
    }
    // 체크리스트 저장 (중간저장)
    @PostMapping("/{eventActionId}/items")
    public ResponseEntity<Void> updateChecklist(
            @PathVariable Long eventActionId,
            @RequestBody CheckListSaveRequest request) {
        eventActionService.updateCheckList(eventActionId, request);

                return ResponseEntity.ok().build();
    }
    // action 완
    @PostMapping("/{eventId}/resolve")
    public ResponseEntity<Void> resolveEvent(
            @PathVariable Long eventId) {
        eventActionService.resolveEvent(eventId);
        return ResponseEntity.ok().build();
    }

}
