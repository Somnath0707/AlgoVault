package com.algovault.service;
import com.algovault.dto.ContestAnalysisResponse;
import com.algovault.model.ContestResult;
import com.algovault.repository.ContestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContestAnalyzerService {
    private final ContestResultRepository repository;

    @Cacheable(value = "contests", key = "#userId")
    public List<ContestAnalysisResponse> getContestHistory(Long userId) {
        List<ContestResult> results = repository.findByUserIdOrderByContestDateDesc(userId);
        
        return results.stream().map(r -> ContestAnalysisResponse.builder()
            .contestTitle(r.getContestTitle())
            .contestDate(r.getContestDate())
            .rank(r.getRank())
            .ratingAfter(r.getNewRating())
            // Fake metrics for deterministic analysis until full submission timing is merged
            .problemsSolved(r.getRank() != null && r.getRank() < 5000 ? 4 : 3)
            .totalProblems(4)
            .finishTimeMinutes(r.getRank() != null && r.getRank() < 1000 ? 30.0 : 65.0)
            .panicIndex(r.getRank() != null && r.getRank() > 10000 ? "High" : "Low")
            .chokingIndex("Normal")
            .staminaDropoff("Low")
            .build()).collect(Collectors.toList());
    }
}
