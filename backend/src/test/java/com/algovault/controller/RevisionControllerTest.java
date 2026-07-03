package com.algovault.controller;

import com.algovault.dto.RevisionResponse;
import com.algovault.model.User;
import com.algovault.service.RevisionService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RevisionControllerTest {

    @Mock
    private RevisionService revisionService;

    @Mock
    private UserContextService userContextService;

    @InjectMocks
    private RevisionController revisionController;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder().id(1L).username("testuser").build();
        when(userContextService.resolveUser(any(HttpServletRequest.class))).thenReturn(testUser);
    }

    @Test
    void getQueue_returnsList() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        List<RevisionResponse> queue = new ArrayList<>();
        queue.add(RevisionResponse.builder().id(10L).title("Two Sum").build());

        when(revisionService.getQueue(1L)).thenReturn(queue);

        ResponseEntity<List<RevisionResponse>> response = revisionController.getQueue(request);

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(1, response.getBody().size());
        assertEquals("Two Sum", response.getBody().get(0).getTitle());

        verify(revisionService, times(1)).getQueue(1L);
    }

    @Test
    void reviewCard_callsService() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        Map<String, Integer> body = new HashMap<>();
        body.put("quality", 5);

        ResponseEntity<Void> response = revisionController.reviewCard(request, 10L, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());

        verify(revisionService, times(1)).reviewCard(1L, 10L, 5);
    }
}
