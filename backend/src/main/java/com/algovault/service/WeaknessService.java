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
        double maxRating = Math.min(3000.0, baselineRating + 400.0);

        List<WeaknessResponse.RecommendedProblem> recommendations = new ArrayList<>();
        Set<String> recommendedSlugs = new HashSet<>();

        if (weakTags.isEmpty()) {
            return WeaknessResponse.builder()
                .weakTags(Collections.emptyList())
                .recommendations(Collections.emptyList())
                .build();
        }

        // Step 1: Batch query for exact weak tags
        List<String> exactTagList = weakTags.stream()
            .map(WeaknessResponse.WeakTag::getTag)
            .filter(Objects::nonNull)
            .toList();

        Map<String, List<Problem>> tagProblemPool = new HashMap<>();
        if (!exactTagList.isEmpty()) {
            String exactTagsJoined = String.join(",", exactTagList);
            List<Problem> batchedExact = problemRepository.findRecommendedUnsolvedByTags(
                userId, exactTagsJoined, minRating, maxRating, targetRating, 80);
            if (batchedExact.size() < 10) {
                List<Problem> wideExact = problemRepository.findRecommendedUnsolvedByTags(
                    userId, exactTagsJoined, 800.0, 3000.0, targetRating, 80);
                batchedExact = mergeProblemLists(batchedExact, wideExact);
            }

            for (Problem p : batchedExact) {
                if (p == null || p.getTags() == null) continue;
                for (String t : exactTagList) {
                    if (p.getTags().stream().anyMatch(pt -> pt.equalsIgnoreCase(t))) {
                        tagProblemPool.computeIfAbsent(t, k -> new ArrayList<>()).add(p);
                    }
                }
            }
        }

        // Collect problems per tag and identify underserved tags
        Map<String, Integer> addedCountPerTag = new HashMap<>();
        for (WeaknessResponse.WeakTag weakTag : weakTags) {
            String tag = weakTag.getTag();
            List<Problem> pool = tagProblemPool.getOrDefault(tag, Collections.emptyList());
            int added = collectProblems(pool, tag, recommendedSlugs, recommendations, 0);
            addedCountPerTag.put(tag, added);
        }

        // Step 2: For underserved tags, batch query fallback tags
        Set<String> neededFallbackTags = new LinkedHashSet<>();
        Map<String, List<String>> tagToFallbacksMap = new HashMap<>();
        for (WeaknessResponse.WeakTag weakTag : weakTags) {
            String tag = weakTag.getTag();
            int currentAdded = addedCountPerTag.getOrDefault(tag, 0);
            if (currentAdded < MAX_PROBLEMS_PER_TAG) {
                List<String> fallbacks = getFallbackTags(tag);
                if (!fallbacks.isEmpty()) {
                    tagToFallbacksMap.put(tag, fallbacks);
                    neededFallbackTags.addAll(fallbacks);
                }
            }
        }

        if (!neededFallbackTags.isEmpty()) {
            String fallbackTagsJoined = String.join(",", neededFallbackTags);
            List<Problem> fallbackPool = problemRepository.findRecommendedUnsolvedByTags(
                userId, fallbackTagsJoined, minRating, maxRating, targetRating, 80);
            if (fallbackPool.size() < 10) {
                List<Problem> wideFallback = problemRepository.findRecommendedUnsolvedByTags(
                    userId, fallbackTagsJoined, 800.0, 3000.0, targetRating, 80);
                fallbackPool = mergeProblemLists(fallbackPool, wideFallback);
            }

            for (WeaknessResponse.WeakTag weakTag : weakTags) {
                String tag = weakTag.getTag();
                int currentAdded = addedCountPerTag.getOrDefault(tag, 0);
                if (currentAdded < MAX_PROBLEMS_PER_TAG && tagToFallbacksMap.containsKey(tag)) {
                    List<String> tagFallbacks = tagToFallbacksMap.get(tag);
                    List<Problem> matchingFallbackProblems = fallbackPool.stream()
                        .filter(p -> p != null && p.getTags() != null && p.getTags().stream().anyMatch(pt ->
                            tagFallbacks.stream().anyMatch(fb -> fb.equalsIgnoreCase(pt))))
                        .toList();
                    int added = collectProblems(matchingFallbackProblems, tag, recommendedSlugs, recommendations, currentAdded);
                    addedCountPerTag.put(tag, currentAdded + added);
                }
            }
        }

        // Step 3: If any tag is still underserved, query general rating band
        boolean hasUnderserved = weakTags.stream()
            .anyMatch(wt -> addedCountPerTag.getOrDefault(wt.getTag(), 0) < MAX_PROBLEMS_PER_TAG);

        if (hasUnderserved) {
            List<Problem> bandProblems = problemRepository.findUnsolvedByRatingBand(
                userId, minRating, maxRating, targetRating, 40);
            if (bandProblems.isEmpty()) {
                bandProblems = problemRepository.findUnsolvedByRatingBand(
                    userId, 800.0, 3000.0, targetRating, 40);
            }

            for (WeaknessResponse.WeakTag weakTag : weakTags) {
                String tag = weakTag.getTag();
                int currentAdded = addedCountPerTag.getOrDefault(tag, 0);
                if (currentAdded < MAX_PROBLEMS_PER_TAG) {
                    int added = collectProblems(bandProblems, tag, recommendedSlugs, recommendations, currentAdded);
                    addedCountPerTag.put(tag, currentAdded + added);
                }
            }
        }

        return WeaknessResponse.builder()
            .weakTags(weakTags)
            .recommendations(recommendations.stream().limit(MAX_TOTAL_RECOMMENDATIONS).collect(Collectors.toList()))
            .build();
    }

    private List<Problem> mergeProblemLists(List<Problem> first, List<Problem> second) {
        if (first == null) first = Collections.emptyList();
        if (second == null) second = Collections.emptyList();
        Set<String> seenSlugs = new HashSet<>();
        List<Problem> merged = new ArrayList<>();
        for (Problem p : first) {
            if (p != null && p.getTitleSlug() != null && seenSlugs.add(p.getTitleSlug())) {
                merged.add(p);
            }
        }
        for (Problem p : second) {
            if (p != null && p.getTitleSlug() != null && seenSlugs.add(p.getTitleSlug())) {
                merged.add(p);
            }
        }
        return merged;
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
