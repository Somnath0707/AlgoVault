package com.algovault.service;

import com.algovault.repository.ContestResultRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.VaultEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExportService {
    private final SubmissionRepository submissionRepository;
    private final ContestResultRepository contestResultRepository;
    private final VaultEntryRepository vaultEntryRepository;

    public Map<String, Object> exportAllUserData(Long userId) {
        Map<String, Object> export = new HashMap<>();
        export.put("submissions", submissionRepository.findByUserId(userId));
        export.put("contests", contestResultRepository.findByUserIdOrderByContestDateDesc(userId));
        export.put("vault", vaultEntryRepository.findByUserIdOrderByUpdatedAtDesc(userId));
        return export;
    }
}
