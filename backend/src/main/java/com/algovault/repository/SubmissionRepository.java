package com.algovault.repository;
import com.algovault.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByUserId(Long userId);
    List<Submission> findByUserIdOrderBySubmittedAtDesc(Long userId);
    boolean existsByUserIdAndProblemIdAndSubmittedAt(Long userId, Long problemId, java.time.LocalDateTime submittedAt);
}
