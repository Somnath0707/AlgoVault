package com.algovault.repository;
import com.algovault.model.RevisionCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionCardRepository extends JpaRepository<RevisionCard, Long> {
    List<RevisionCard> findByUserIdAndNextReviewBeforeOrderByNextReviewAsc(Long userId, LocalDateTime date);
    Optional<RevisionCard> findByUserIdAndProblemId(Long userId, Long problemId);
    Integer countByUserIdAndNextReviewBefore(Long userId, LocalDateTime date);
}
