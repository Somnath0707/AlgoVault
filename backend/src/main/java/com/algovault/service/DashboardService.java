package com.algovault.service;

import com.algovault.dto.DashboardResponse;
import com.algovault.model.Submission;
import com.algovault.model.SyncMetadata;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.SyncMetadataRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final UserRepository userRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final SubmissionRepository submissionRepository;

    @Cacheable(value = "dashboard", key = "#userId")
    public DashboardResponse getDashboard(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        SyncMetadata meta = syncMetadataRepository.findByUserId(userId).orElse(new SyncMetadata());
        
        List<Submission> recentSubs = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId)
            .stream()
            .filter(s -> "Accepted".equals(s.getVerdict()))
            .limit(5)
            .collect(Collectors.toList());

        List<DashboardResponse.RecentSolve> recentSolves = recentSubs.stream()
            .map(s -> DashboardResponse.RecentSolve.builder()
                .title(s.getProblem().getTitle())
                .titleSlug(s.getProblem().getTitleSlug())
                .difficulty(s.getProblem().getDifficulty())
                .solvedAt(s.getSubmittedAt())
                .build())
            .collect(Collectors.toList());

        return DashboardResponse.builder()
            .virtualRating(user.getVirtualRating() != null ? user.getVirtualRating() : 1500)
            .lcRating(user.getLcRating() != null ? user.getLcRating() : 1500)
            .lastSyncTime(meta.getLastSyncTime())
            .totalSolved(meta.getTotalProblems() != null ? meta.getTotalProblems() : 0)
            .totalSubmissions(meta.getTotalSubmissions() != null ? meta.getTotalSubmissions() : 0)
            .currentStreak(0) // TODO: Calculate actual streak
            .recentSolves(recentSolves)
            .build();
    }
}
