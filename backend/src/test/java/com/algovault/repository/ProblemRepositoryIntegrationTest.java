package com.algovault.repository;

import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.User;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProblemRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (postgres.isRunning()) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
    }

    @BeforeAll
    static void checkDocker() {
        try {
            Assumptions.assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "Docker environment not available; skipping integration tests");
        } catch (Throwable t) {
            Assumptions.assumeTrue(false, "Docker environment not available: " + t.getMessage());
        }
    }

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        problemRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
            .username("testcoder")
            .githubId("github_123")
            .lcRating(1600)
            .virtualRating(1600)
            .build());
    }

    @Test
    void findRecommendedUnsolvedByTags_matchesTagsUsingStringToArrayAndRespectsFilters() {
        // Problem 1: Binary Search (stored as "Binary Search") - Non-premium, unsolved
        Problem p1 = problemRepository.save(Problem.builder()
            .title("Binary Search")
            .titleSlug("binary-search")
            .difficulty("Easy")
            .actualRating(1200.0)
            .tags(List.of("Binary Search", "Array"))
            .isPremium(false)
            .acceptanceRate(55.0)
            .build());

        // Problem 2: Ternary Search (stored as "ternary-search") - Non-premium, unsolved
        Problem p2 = problemRepository.save(Problem.builder()
            .title("Ternary Search Prob")
            .titleSlug("ternary-search-prob")
            .difficulty("Medium")
            .actualRating(1650.0)
            .tags(List.of("ternary-search"))
            .isPremium(false)
            .acceptanceRate(45.0)
            .build());

        // Problem 3: Premium problem - should be excluded
        Problem p3 = problemRepository.save(Problem.builder()
            .title("Premium Search")
            .titleSlug("premium-search")
            .difficulty("Medium")
            .actualRating(1600.0)
            .tags(List.of("Binary Search"))
            .isPremium(true)
            .acceptanceRate(40.0)
            .build());

        // Problem 4: Already accepted problem - should be excluded
        Problem p4 = problemRepository.save(Problem.builder()
            .title("Solved Search")
            .titleSlug("solved-search")
            .difficulty("Easy")
            .actualRating(1100.0)
            .tags(List.of("Binary Search"))
            .isPremium(false)
            .acceptanceRate(60.0)
            .build());

        submissionRepository.save(Submission.builder()
            .user(testUser)
            .problem(p4)
            .verdict("Accepted")
            .submittedAt(LocalDateTime.now())
            .build());

        // Query with comma-separated tags containing both hyphenated and spaced variants
        String queryTags = "binary-search,Binary Search,ternary-search";
        List<Problem> results = problemRepository.findRecommendedUnsolvedByTags(
            testUser.getId(), queryTags, 800.0, 3000.0, 1650.0, 10);

        assertNotNull(results);
        assertEquals(2, results.size(), "Should return only p1 and p2 (excluding premium p3 and solved p4)");
        assertTrue(results.stream().anyMatch(p -> p.getTitleSlug().equals("binary-search")));
        assertTrue(results.stream().anyMatch(p -> p.getTitleSlug().equals("ternary-search-prob")));
        assertEquals("ternary-search-prob", results.get(0).getTitleSlug(), "Closest rating to target 1650 should come first");
    }

    @Test
    void findUnsolvedByRatingBand_returnsNonPremiumUnsolvedProblems() {
        Problem p1 = problemRepository.save(Problem.builder()
            .title("Dynamic Problem")
            .titleSlug("dynamic-problem")
            .difficulty("Medium")
            .actualRating(1550.0)
            .tags(List.of("Dynamic Programming"))
            .isPremium(false)
            .acceptanceRate(50.0)
            .build());

        List<Problem> results = problemRepository.findUnsolvedByRatingBand(
            testUser.getId(), 1400.0, 1700.0, 1550.0, 10);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("dynamic-problem", results.get(0).getTitleSlug());
    }
}
