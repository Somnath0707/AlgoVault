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
    boolean existsByUserIdAndProblemIdAndSubmittedAt(Long userId, Long problemId, LocalDateTime submittedAt);
    Optional<Submission> findByUserIdAndLeetcodeSubmissionId(Long userId, String leetcodeSubmissionId);
    long countByUserId(Long userId);

    @Query("select count(distinct s.problem.id) from Submission s where s.user.id = :userId and s.verdict = 'Accepted'")
    long countSolvedProblems(Long userId);

    @Query("select distinct s.submittedAt from Submission s where s.user.id = :userId and s.verdict = 'Accepted' order by s.submittedAt desc")
    List<LocalDateTime> findAcceptedDatesDesc(Long userId);
}
