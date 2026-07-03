package com.algovault.repository;
import com.algovault.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByUserId(Long userId);
    List<Submission> findByUserIdOrderBySubmittedAtDesc(Long userId);
    List<Submission> findByUserIdAndProblemId(Long userId, Long problemId);
    boolean existsByUserIdAndProblemIdAndSubmittedAt(Long userId, Long problemId, LocalDateTime submittedAt);
    Optional<Submission> findByUserIdAndLeetcodeSubmissionId(Long userId, String leetcodeSubmissionId);
    long countByUserId(Long userId);

    @Query("select count(distinct s.problem.id) from Submission s where s.user.id = :userId and s.verdict = 'Accepted'")
    long countSolvedProblems(Long userId);

    @Query("select distinct s.submittedAt from Submission s where s.user.id = :userId and s.verdict = 'Accepted' order by s.submittedAt desc")
    List<LocalDateTime> findAcceptedDatesDesc(Long userId);

    @Query("select count(distinct s.problem.id) from Submission s where s.user.id = :userId and s.submittedAt >= :since")
    long countDistinctProblemsSince(Long userId, LocalDateTime since);

    @Query("select count(distinct s.problem.id) from Submission s where s.user.id = :userId and s.submittedAt >= :since and s.verdict = 'Accepted'")
    long countDistinctSolvedProblemsSince(Long userId, LocalDateTime since);

    @Query("select count(s.id) from Submission s where s.user.id = :userId and s.submittedAt >= :since")
    long countSubmissionsSince(Long userId, LocalDateTime since);

    List<Submission> findTop5ByUserIdAndVerdictOrderBySubmittedAtDesc(Long userId, String verdict);

    @Query("select count(s) > 0 from Submission s where s.user.id = :userId and s.problem.id = :problemId and s.verdict = :verdict and s.submittedAt = :submittedAt and " +
           "((:runtimeMs is null and s.runtimeMs is null) or s.runtimeMs = :runtimeMs)")
    boolean existsByTighterTuple(Long userId, Long problemId, String verdict, java.time.LocalDateTime submittedAt, Integer runtimeMs);
}
