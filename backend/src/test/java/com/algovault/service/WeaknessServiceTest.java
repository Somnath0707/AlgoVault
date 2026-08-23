package com.algovault.service;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.Problem;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WeaknessServiceTest {

    @Mock
    private TagMasteryRepository tagMasteryRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WeaknessService weaknessService;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder().id(1L).lcRating(1600).virtualRating(1600).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
    }

    @Test
    void getWeakness_handlesNullMasteryScoreGracefully() {
        TagMastery validTag = TagMastery.builder().tag("DP").masteryScore(1200.0).totalAttempted(5).build();
        TagMastery nullScoreTag = TagMastery.builder().tag("Greedy").masteryScore(null).totalAttempted(3).build();
        TagMastery nullAttemptedTag = TagMastery.builder().tag("Tree").masteryScore(1400.0).totalAttempted(null).build();

        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(1L)).thenReturn(List.of(validTag, nullScoreTag, nullAttemptedTag));
        when(problemRepository.findRecommendedUnsolvedByTags(anyLong(), anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Collections.emptyList());
        when(problemRepository.findUnsolvedByRatingBand(anyLong(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Collections.emptyList());

        WeaknessResponse response = weaknessService.getWeakness(1L);

        assertNotNull(response);
        assertEquals(1, response.getWeakTags().size());
        assertEquals("DP", response.getWeakTags().get(0).getTag());
        assertEquals("MODERATE", response.getWeakTags().get(0).getEvidenceLevel());
    }

    @Test
    void getWeakness_handlesNullTitleSlugAndNullProblems() {
        TagMastery tm = TagMastery.builder().tag("Array").masteryScore(1100.0).totalAttempted(10).build();
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(1L)).thenReturn(List.of(tm));

        Problem validProblem = Problem.builder().id(1L).title("Two Sum").titleSlug("two-sum").tags(List.of("Array")).build();
        Problem nullSlugProblem = Problem.builder().id(2L).title("Invalid Problem").titleSlug(null).tags(List.of("Array")).build();

        List<Problem> mockProblems = new ArrayList<>();
        mockProblems.add(validProblem);
        mockProblems.add(nullSlugProblem);
        mockProblems.add(null);

        when(problemRepository.findRecommendedUnsolvedByTags(eq(1L), anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(mockProblems);

        WeaknessResponse response = weaknessService.getWeakness(1L);

        assertNotNull(response);
        assertEquals(1, response.getRecommendations().size());
        assertEquals("two-sum", response.getRecommendations().get(0).getTitleSlug());
    }

    @Test
    void getWeakness_nicheTag_usesFallbackTagsWhenExactTagEmpty() {
        TagMastery nicheTag = TagMastery.builder().tag("ternary-search").masteryScore(1000.0).totalAttempted(2).build();
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(1L)).thenReturn(List.of(nicheTag));

        // Exact batched tag returns empty
        when(problemRepository.findRecommendedUnsolvedByTags(eq(1L), contains("ternary-search"), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Collections.emptyList());

        // Fallback tags return problems with matching tag
        Problem fallbackProblem = Problem.builder().id(10L).title("Binary Search").titleSlug("binary-search")
            .tags(List.of("binary-search")).actualRating(1650.0).build();
        when(problemRepository.findRecommendedUnsolvedByTags(eq(1L), contains("binary-search"), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(List.of(fallbackProblem));

        WeaknessResponse response = weaknessService.getWeakness(1L);

        assertNotNull(response);
        assertEquals(1, response.getRecommendations().size());
        assertEquals("binary-search", response.getRecommendations().get(0).getTitleSlug());
        assertEquals("ternary-search", response.getRecommendations().get(0).getTag());
    }

    @Test
    void getWeakness_nicheTag_usesRatingBandWhenNoFallbackOrFallbackEmpty() {
        TagMastery unknownNicheTag = TagMastery.builder().tag("unknown-niche").masteryScore(900.0).totalAttempted(1).build();
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(1L)).thenReturn(List.of(unknownNicheTag));

        // Exact tag returns empty
        when(problemRepository.findRecommendedUnsolvedByTags(eq(1L), anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Collections.emptyList());

        // Rating band returns problem
        Problem bandProblem = Problem.builder().id(20L).title("General Problem").titleSlug("general-problem")
            .tags(List.of("math")).actualRating(1620.0).build();
        when(problemRepository.findUnsolvedByRatingBand(eq(1L), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(List.of(bandProblem));

        WeaknessResponse response = weaknessService.getWeakness(1L);

        assertNotNull(response);
        assertEquals(1, response.getRecommendations().size());
        assertEquals("general-problem", response.getRecommendations().get(0).getTitleSlug());
    }

    @Test
    void getWeakness_deduplicatesProblemsAcrossMultipleWeakTags() {
        TagMastery tag1 = TagMastery.builder().tag("DP").masteryScore(1000.0).totalAttempted(5).build();
        TagMastery tag2 = TagMastery.builder().tag("Recursion").masteryScore(1050.0).totalAttempted(5).build();
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(1L)).thenReturn(List.of(tag1, tag2));

        Problem sharedProblem = Problem.builder().id(30L).title("Climbing Stairs").titleSlug("climbing-stairs").tags(List.of("DP", "Recursion")).build();
        Problem uniqueProblem = Problem.builder().id(31L).title("House Robber").titleSlug("house-robber").tags(List.of("Recursion")).build();

        when(problemRepository.findRecommendedUnsolvedByTags(eq(1L), anyString(), anyDouble(), anyDouble(), anyDouble(), anyInt()))
            .thenReturn(List.of(sharedProblem, uniqueProblem));

        WeaknessResponse response = weaknessService.getWeakness(1L);

        assertNotNull(response);
        assertEquals(2, response.getRecommendations().size());
        assertEquals("climbing-stairs", response.getRecommendations().get(0).getTitleSlug());
        assertEquals("house-robber", response.getRecommendations().get(1).getTitleSlug());
    }
}
