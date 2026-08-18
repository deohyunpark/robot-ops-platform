package com.example.robotops.domain.controller;

import com.example.robotops.domain.enums.InsightFeedDltStatus;
import com.example.robotops.domain.response.InsightFeedDltResponse;
import com.example.robotops.domain.service.InsightFeedDltService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/admin/dlt")
public class InsightFeedDltController {

    private final InsightFeedDltService insightFeedDltService;

    @GetMapping
    public List<InsightFeedDltResponse> findAll(
            @RequestParam(required = false) InsightFeedDltStatus status
    ) {
        return insightFeedDltService.findAll(status);
    }

    @GetMapping("/{id}")
    public InsightFeedDltResponse findById(@PathVariable Long id) {
        return insightFeedDltService.findById(id);
    }

    @PostMapping("/{id}/replay")
    public InsightFeedDltResponse replay(@PathVariable Long id) {
        return insightFeedDltService.replay(id);
    }

    @PostMapping("/{id}/discard")
    public InsightFeedDltResponse discard(@PathVariable Long id) {
        return insightFeedDltService.discard(id);
    }
}
