package com.algovault.service;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.Problem;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class WeaknessService {
    /** Allow any weak tag with at least 1 attempt to generate recommendations */
    private static final int MIN_RECOMMENDATION_EVIDENCE = 1;
    private static final int MAX_PROBLEMS_PER_TAG = 8;
    private static final int MAX_TOTAL_RECOMMENDATIONS = 40;

    private static final Map<String, List<String>> FALLBACK_TAGS = new HashMap<>();

    static {
        registerFallback("ternary-search", List.of("binary-search", "divide-and-conquer"));
        registerFallback("newtons-method", List.of("math", "binary-search"));
        registerFallback("bucket-sort", List.of("sorting"));
        registerFallback("manacher", List.of("string", "palindrome"));
        registerFallback("segment-tree", List.of("binary-indexed-tree", "divide-and-conquer"));
        registerFallback("trie", List.of("string", "hash-table"));
        registerFallback("topological-sort", List.of("graph", "depth-first-search"));
        registerFallback("union-find", List.of("graph", "depth-first-search"));
        registerFallback("suffix-array", List.of("string", "binary-search"));
        registerFallback("minimum-spanning-tree", List.of("graph", "union-find"));
    }

    private static void registerFallback(String key, List<String> fallbacks) {
        FALLBACK_TAGS.put(key, fallbacks);
        String spaced = key.replace("-", " ");
        FALLBACK_TAGS.put(spaced, fallbacks);
    }

    private final TagMasteryRepository tagMasteryRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "weakness", key = "#userId")
    public WeaknessResponse getWeakness(Long userId) {
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        if (masteries == null) {
            masteries = Collections.emptyList();
        }

        // Filter out null masteryScores and require at least MIN_RECOMMENDATION_EVIDENCE
        List<WeaknessResponse.WeakTag> weakTags = masteries.stream()
            .filter(m -> m != null && m.getMasteryScore() != null && m.getTotalAttempted() != null && m.getTotalAttempted() >= MIN_RECOMMENDATION_EVIDENCE)
            .sorted((m1, m2) -> {
                int scoreCompare = Double.compare(m1.getMasteryScore(), m2.getMasteryScore());
                if (scoreCompare != 0) return scoreCompare;
                return Integer.compare(m1.getTotalAttempted(), m2.getTotalAttempted());
            })
            .limit(8)
            .map(m -> {
                String evidenceLevel;
                if (m.getTotalAttempted() >= 10) {
                    evidenceLevel = "STRONG";
                } else if (m.getTotalAttempted() >= 5) {
                    evidenceLevel = "MODERATE";
                } else if (m.getTotalAttempted() >= 3) {
                    evidenceLevel = "PRELIMINARY";
                } else {
                    evidenceLevel = "EARLY";
                }
                return WeaknessResponse.WeakTag.builder()
                    .tag(m.getTag())
                    .masteryScore(m.getMasteryScore())
                    .rd(m.getRd())
                    .evidenceLevel(evidenceLevel)
                    .totalAttempted(m.getTotalAttempted())
                    .build();
            })
            .collect(Collectors.toList());

        User user = userRepository.findById(userId).orElseThrow();
        int baselineRating = user.getVirtualRating() != null
            ? user.getVirtualRating()
            : user.getLcRating() != null ? user.getLcRating() : 1500;
        double targetRating = baselineRating + 50.0;
        double minRating = Math.max(800.0, baselineRating - 200.0);
        double maxRating = baselineRating + 400.0;

        List<WeaknessResponse.RecommendedProblem> recommendations = new ArrayList<>();
        Set<String> recommendedSlugs = new HashSet<>();

        for (WeaknessResponse.WeakTag weakTag : weakTags) {
            if (weakTag.getTag() == null) continue;
            int addedForTag = 0;

            // 1. Try exact weak tag in primary rating window
            List<Problem> problems = problemRepository.findRecommendedUnsolved(
                userId, weakTag.getTag(), minRating, maxRating, targetRating, MAX_TOTAL_RECOMMENDATIONS);
            if (problems.isEmpty()) {
                // Widen rating window for exact tag
                problems = problemRepository.findRecommendedUnsolved(
                    userId, weakTag.getTag(), 800.0, 3000.0, targetRating, MAX_TOTAL_RECOMMENDATIONS);
            }
            addedForTag += collectProblems(problems, weakTag.getTag(), recommendedSlugs, recommendations, addedForTag);

            // 2. If exact tag has few/no unsolved problems (niche tag), query fallback tags
            if (addedForTag < MAX_PROBLEMS_PER_TAG) {
                List<String> fallbacks = getFallbackTags(weakTag.getTag());
                if (!fallbacks.isEmpty()) {
                    String[] fallbackArr = fallbacks.toArray(new String[0]);
                    List<Problem> fallbackProblems = problemRepository.findRecommendedUnsolvedByTags(
                        userId, fallbackArr, minRating, maxRating, targetRating, MAX_TOTAL_RECOMMENDATIONS);
                    if (fallbackProblems.isEmpty()) {
                        fallbackProblems = problemRepository.findRecommendedUnsolvedByTags(
                            userId, fallbackArr, 800.0, 3000.0, targetRating, MAX_TOTAL_RECOMMENDATIONS);
                    }
                    addedForTag += collectProblems(fallbackProblems, weakTag.getTag(), recommendedSlugs, recommendations, addedForTag);
                }
            }

            // 3. If still not enough problems, try rating band without tag filter
            if (addedForTag < MAX_PROBLEMS_PER_TAG) {
                List<Problem> bandProblems = problemRepository.findUnsolvedByRatingBand(
                    userId, minRating, maxRating, targetRating, MAX_TOTAL_RECOMMENDATIONS);
                if (bandProblems.isEmpty()) {
                    bandProblems = problemRepository.findUnsolvedByRatingBand(
                        userId, 800.0, 3000.0, targetRating, MAX_TOTAL_RECOMMENDATIONS);
                }
                addedForTag += collectProblems(bandProblems, weakTag.getTag(), recommendedSlugs, recommendations, addedForTag);
            }
        }

        return WeaknessResponse.builder()
            .weakTags(weakTags)
            .recommendations(recommendations.stream().limit(MAX_TOTAL_RECOMMENDATIONS).collect(Collectors.toList()))
            .build();
    }

    private int collectProblems(List<Problem> candidateProblems, String tag, Set<String> recommendedSlugs,
                                List<WeaknessResponse.RecommendedProblem> recommendations, int currentCount) {
        if (candidateProblems == null || candidateProblems.isEmpty()) return 0;
        int added = 0;
        for (Problem p : candidateProblems) {
            if (currentCount + added >= MAX_PROBLEMS_PER_TAG) break;
            if (p != null && p.getTitleSlug() != null && !recommendedSlugs.contains(p.getTitleSlug())) {
                recommendedSlugs.add(p.getTitleSlug());
                recommendations.add(WeaknessResponse.RecommendedProblem.builder()
                    .title(p.getTitle())
                    .titleSlug(p.getTitleSlug())
                    .tag(tag)
                    .difficulty(p.getDifficulty())
                    .actualRating(p.getActualRating())
                    .frontendId(p.getFrontendId())
                    .acceptanceRate(p.getAcceptanceRate())
                    .build());
                added++;
            }
        }
        return added;
    }

    private List<String> getFallbackTags(String rawTag) {
        if (rawTag == null) return Collections.emptyList();
        String normalized = rawTag.trim().toLowerCase().replace("_", "-").replace(" ", "-");
        List<String> found = FALLBACK_TAGS.get(normalized);
        if (found != null) return found;
        return FALLBACK_TAGS.getOrDefault(rawTag.trim().toLowerCase(), Collections.emptyList());
    }

    @CacheEvict(value = "weakness", key = "#userId")
    public void evictWeaknessCache(Long userId) {
        // Just evicts the cache
    }
}
