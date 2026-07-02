package com.algovault.controller;

import com.algovault.dto.SessionRequests;
import com.algovault.dto.SessionResponse;
import com.algovault.model.User;
import com.algovault.service.SessionService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {
    private final UserContextService userContextService;
    private final SessionService sessionService;

    @PostMapping("/start")
    public ResponseEntity<SessionResponse> start(HttpServletRequest servletRequest, @RequestBody(required = false) SessionRequests.StartSessionRequest request) {
        User user = userContextService.resolveUser(servletRequest);
        String mode = request != null ? request.getMode() : null;
        return ResponseEntity.ok(sessionService.startSession(user, mode));
    }

    @PostMapping("/end")
    public ResponseEntity<SessionResponse> end(HttpServletRequest servletRequest) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.endCurrentSession(user));
    }

    @PostMapping("/event")
    public ResponseEntity<SessionResponse> event(HttpServletRequest servletRequest, @RequestBody SessionRequests.EventRequest request) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.recordEvent(user, request));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<SessionResponse> heartbeat(HttpServletRequest servletRequest, @RequestBody SessionRequests.HeartbeatRequest request) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.heartbeat(user, request));
    }

    @PostMapping("/submission")
    public ResponseEntity<SessionResponse> submission(HttpServletRequest servletRequest, @RequestBody SessionRequests.SubmissionResultRequest request) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.recordSubmission(user, request));
    }

    @PostMapping("/self-report")
    public ResponseEntity<Void> selfReport(HttpServletRequest servletRequest, @RequestBody SessionRequests.SelfReportRequest request) {
        User user = userContextService.resolveUser(servletRequest);
        sessionService.recordSelfReport(user, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/current")
    public ResponseEntity<SessionResponse> current(HttpServletRequest servletRequest) {
        User user = userContextService.resolveUser(servletRequest);
        SessionResponse current = sessionService.getCurrent(user);
        return current == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(current);
    }

    @GetMapping("/today")
    public ResponseEntity<List<SessionResponse>> today(HttpServletRequest servletRequest) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.getToday(user));
    }

    @GetMapping("/all")
    public ResponseEntity<List<SessionResponse>> all(HttpServletRequest servletRequest) {
        User user = userContextService.resolveUser(servletRequest);
        return ResponseEntity.ok(sessionService.getAll(user));
    }
}
