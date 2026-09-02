package com.algovault.repository;
import com.algovault.model.RevisionCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionCardRepository extends JpaRepository<RevisionCard, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"problem"})
    List<RevisionCard> findByUserIdAndNextReviewBeforeOrderByNextReviewAsc(Long userId, LocalDateTime date);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"problem"})
    @org.springframework.data.jpa.repository.Query("""
        select card from RevisionCard card
        where card.user.id = :userId
          and card.nextReview <= :now
          and exists (
              select 1 from Submission submission
              where submission.user.id = :userId
                and submission.problem.id = card.problem.id
                and submission.verdict = 'Accepted'
                and submission.submittedAt >= :since
          )
        order by card.nextReview asc
        """)
    List<RevisionCard> findDueByUserIdAndAcceptedSince(Long userId, LocalDateTime now, LocalDateTime since);

    Optional<RevisionCard> findByUserIdAndProblemId(Long userId, Long problemId);
    Integer countByUserIdAndNextReviewBefore(Long userId, LocalDateTime date);
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"problem"})
    List<RevisionCard> findByUserIdOrderByNextReviewAsc(Long userId);
}
