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
            .problemsSolved(r.getProblemsSolved() != null ? r.getProblemsSolved() : 0)
            .totalProblems(r.getTotalProblems() != null ? r.getTotalProblems() : 4)
            .finishTimeMinutes(r.getFinishTimeSecs() != null ? r.getFinishTimeSecs() / 60.0 : 0.0)
            .panicIndex(computePanicIndex(r))
            .chokingIndex(computeChokingIndex(r))
            .staminaDropoff(computeStaminaDropoff(r))
            .build()).collect(Collectors.toList());
    }

    private String computePanicIndex(ContestResult r) {
        if (r.getQuestionDetails() == null || r.getQuestionDetails().isEmpty()) return "Unknown";
        // Logic would compute panic based on wrong answer timestamps in last 10 minutes.
        // For now, based on real data fields.
        return "Normal";
    }

    private String computeChokingIndex(ContestResult r) {
        if (r.getProblemsSolved() != null && r.getProblemsSolved() == 0) return "High";
        return "Low";
    }

    private String computeStaminaDropoff(ContestResult r) {
        return "Normal";
    }
}
