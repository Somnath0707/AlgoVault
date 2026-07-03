package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.model.VaultEntry;
import com.algovault.service.VaultService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VaultControllerTest {

    @Mock
    private VaultService vaultService;

    @Mock
    private UserContextService userContextService;

    @InjectMocks
    private VaultController vaultController;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder().id(1L).username("testuser").build();
        when(userContextService.resolveUser(any(HttpServletRequest.class))).thenReturn(testUser);
    }

    @Test
    void getVault_returnsList() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        List<VaultEntry> entries = new ArrayList<>();
        entries.add(VaultEntry.builder().id(10L).title("Two Sum").build());

        when(vaultService.searchVault(1L, "Two Sum")).thenReturn(entries);

        ResponseEntity<List<VaultEntry>> response = vaultController.getVault(request, "Two Sum");

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(1, response.getBody().size());
        assertEquals("Two Sum", response.getBody().get(0).getTitle());

        verify(vaultService, times(1)).searchVault(1L, "Two Sum");
    }

    @Test
    void saveEntry_returnsSavedEntry() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        VaultEntry entry = VaultEntry.builder().title("Two Sum").build();
        VaultEntry savedEntry = VaultEntry.builder().id(10L).title("Two Sum").build();

        when(vaultService.saveEntry(1L, entry)).thenReturn(savedEntry);

        ResponseEntity<VaultEntry> response = vaultController.saveEntry(request, entry);

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(10L, response.getBody().getId());

        verify(vaultService, times(1)).saveEntry(1L, entry);
    }

    @Test
    void deleteEntry_callsServiceDelete() {
        HttpServletRequest request = mock(HttpServletRequest.class);

        ResponseEntity<Void> response = vaultController.deleteEntry(request, 10L);

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());

        verify(vaultService, times(1)).deleteEntry(1L, 10L);
    }
}
