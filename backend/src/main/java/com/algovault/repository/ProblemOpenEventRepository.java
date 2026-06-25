package com.algovault.repository;
import com.algovault.model.ProblemOpenEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface ProblemOpenEventRepository extends JpaRepository<ProblemOpenEvent, Long> {
    Optional<ProblemOpenEvent> findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(Long userId, Long problemId);
    java.util.List<ProblemOpenEvent> findByUserId(Long userId);
}
