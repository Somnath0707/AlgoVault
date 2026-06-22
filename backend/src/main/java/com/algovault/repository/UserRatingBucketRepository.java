package com.algovault.repository;
import com.algovault.model.UserRatingBucket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface UserRatingBucketRepository extends JpaRepository<UserRatingBucket, Long> {
    List<UserRatingBucket> findByUserId(Long userId);
}
