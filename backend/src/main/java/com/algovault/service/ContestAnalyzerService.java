package com.algovault.service;
import com.algovault.dto.ContestAnalysisResponse;
import com.algovault.model.ContestResult;
import com.algovault.repository.ContestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContestAnalyzerService {
    private final ContestResultRepository repository;

    public List<ContestAnalysisResponse> getContestHistory(Long userId) {
        List<ContestResult> results = repository.findByUserIdOrderByContestDateDesc(userId);

        return java.util.stream.IntStream.range(0, results.size()).mapToObj(i -> {
            ContestResult r = results.get(i);

            // predictedDelta is now fetched dynamically from EntrantHub API by the Chrome Extension
            Double predictedDelta = null;

            return ContestAnalysisResponse.builder()
                .contestTitle(r.getContestTitle())
                .contestSlug(r.getContestSlug())
                .contestDate(r.getContestDate())
                .rank(r.getRank())
                .ratingBefore(r.getOldRating() != null
                    ? r.getOldRating()
                    : r.getNewRating() != null && r.getRatingDelta() != null ? r.getNewRating() - r.getRatingDelta() : null)
                .ratingAfter(r.getNewRating())
                .ratingDelta(r.getRatingDelta())
                .predictedDelta(predictedDelta)
                .problemsSolved(r.getProblemsSolved() != null ? r.getProblemsSolved() : 0)
                .totalProblems(r.getTotalProblems())
                .finishTimeMinutes(r.getFinishTimeSecs() != null ? r.getFinishTimeSecs() / 60.0 : null)
                .panicIndex(computePanicIndex(r))
                .chokingIndex(computeChokingIndex(r))
                .staminaDropoff(computeStaminaDropoff(r))
                .questionDetails(r.getQuestionDetails())
                .build();
        }).collect(Collectors.toList());
    }

    private String computePanicIndex(ContestResult r) {
        if (r.getQuestionDetails() == null || !r.getQuestionDetails().containsKey("submissions")) return "Unknown";
        List<Map<String, Object>> subs = submissions(r);
        if (subs == null || subs.isEmpty()) return "Low";

        long contestStart = r.getContestDate().atZone(java.time.ZoneId.systemDefault()).toEpochSecond();
        long panicWindowStart = contestStart + 4800; // Last 10 minutes (90 mins total)

        int totalWrong = 0;
        int panicWrong = 0;

        for (Map<String, Object> sub : subs) {
            String verdict = (String) sub.get("verdict");
            if (!"Accepted".equals(verdict)) {
                totalWrong++;
                long ts = ((Number) sub.get("timestamp")).longValue();
                if (ts >= panicWindowStart) {
                    panicWrong++;
                }
            }
        }

        if (totalWrong == 0) return "Low";
        double panicRatio = (double) panicWrong / totalWrong;
        if (panicRatio > 0.4) return "High";
        if (panicRatio > 0.2) return "Medium";
        return "Low";
    }

    private String computeChokingIndex(ContestResult r) {
        if (r.getQuestionDetails() == null || !r.getQuestionDetails().containsKey("submissions")) return "Unknown";
        List<Map<String, Object>> subs = submissions(r);
        if (subs == null || subs.isEmpty()) return "Unknown";

        java.util.Set<String> attempted = new java.util.HashSet<>();
        java.util.Set<String> solved = new java.util.HashSet<>();

        for (Map<String, Object> sub : subs) {
            String slug = (String) sub.get("titleSlug");
            attempted.add(slug);
            if ("Accepted".equals(sub.get("verdict"))) {
                solved.add(slug);
            }
        }

        if (attempted.isEmpty()) return "Unknown";
        int choked = attempted.size() - solved.size();
        double chokeRatio = (double) choked / attempted.size();

        if (chokeRatio > 0.5) return "High";
        if (chokeRatio > 0.25) return "Medium";
        return "Low";
    }

    private String computeStaminaDropoff(ContestResult r) {
        if (r.getQuestionDetails() == null || !r.getQuestionDetails().containsKey("submissions")) return "Unknown";
        List<Map<String, Object>> subs = submissions(r);
        if (subs == null || subs.isEmpty()) return "Unknown";

        long contestStart = r.getContestDate().atZone(java.time.ZoneId.systemDefault()).toEpochSecond();

        java.util.Map<String, Long> firstAcTimes = new java.util.HashMap<>();
        for (Map<String, Object> sub : subs) {
            if ("Accepted".equals(sub.get("verdict"))) {
                String slug = (String) sub.get("titleSlug");
                long ts = ((Number) sub.get("timestamp")).longValue();
                firstAcTimes.putIfAbsent(slug, ts);
            }
        }

        if (firstAcTimes.size() < 3) return "Unknown"; // Need at least 3 solves to compare Q1/Q2 vs Q3/Q4

        List<Long> solveTimes = new java.util.ArrayList<>();
        long previousAc = contestStart;

        // Sort the ACs by timestamp to figure out time spent on each
        List<Map.Entry<String, Long>> sortedAcs = new java.util.ArrayList<>(firstAcTimes.entrySet());
        sortedAcs.sort(java.util.Map.Entry.comparingByValue());

        for (Map.Entry<String, Long> entry : sortedAcs) {
            long timeSpent = entry.getValue() - previousAc;
            solveTimes.add(timeSpent);
            previousAc = entry.getValue();
        }

        if (solveTimes.size() < 3) return "Unknown";

        double earlyAvg = (solveTimes.get(0) + solveTimes.get(1)) / 2.0;
        double lateSum = 0;
        for (int i = 2; i < solveTimes.size(); i++) {
            lateSum += solveTimes.get(i);
        }
        double lateAvg = lateSum / (solveTimes.size() - 2);

        if (earlyAvg == 0) return "High"; // Early problems solved instantly?

        double ratio = lateAvg / earlyAvg;
        if (ratio > 2.0) return "High";
        if (ratio > 1.5) return "Medium";
        return "Low";
    }

    private List<Map<String, Object>> submissions(ContestResult result) {
        Object raw = result.getQuestionDetails().get("submissions");
        if (!(raw instanceof List<?> items)) {
            return List.of();
        }
        return items.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .toList();
    }
}
