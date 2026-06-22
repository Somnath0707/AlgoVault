package com.algovault.repository;
import com.algovault.model.TagMastery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface TagMasteryRepository extends JpaRepository<TagMastery, Long> {
    List<TagMastery> findByUserIdOrderByMasteryScoreDesc(Long userId);
    Optional<TagMastery> findByUserIdAndTag(Long userId, String tag);
}
