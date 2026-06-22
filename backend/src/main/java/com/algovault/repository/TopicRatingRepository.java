package com.algovault.repository;
import com.algovault.model.TopicRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface TopicRatingRepository extends JpaRepository<TopicRating, Long> {
    List<TopicRating> findByUserId(Long userId);
    Optional<TopicRating> findByUserIdAndTag(Long userId, String tag);
}
