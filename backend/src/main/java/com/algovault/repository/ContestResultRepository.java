package com.algovault.repository;
import com.algovault.model.ContestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface ContestResultRepository extends JpaRepository<ContestResult, Long> {
    List<ContestResult> findByUserIdOrderByContestDateDesc(Long userId);
    boolean existsByUserIdAndContestTitle(Long userId, String contestTitle);
}
