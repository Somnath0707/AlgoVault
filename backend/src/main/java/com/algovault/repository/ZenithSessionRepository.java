package com.algovault.repository;

import com.algovault.model.ZenithSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ZenithSessionRepository extends JpaRepository<ZenithSession, Long> {
    @EntityGraph(attributePaths = {"problem"})
    List<ZenithSession> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"problem"})
    List<ZenithSession> findByUserIdOrderBySolvedAtDesc(Long userId);

    Optional<ZenithSession> findByUserIdAndProblemId(Long userId, Long problemId);
}
