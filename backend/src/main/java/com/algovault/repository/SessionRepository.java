package com.algovault.repository;

import com.algovault.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(Long userId);
    List<Session> findByUserIdAndStartedAtAfterOrderByStartedAtDesc(Long userId, LocalDateTime startedAt);
    List<Session> findByUserIdOrderByStartedAtDesc(Long userId);
    List<Session> findByEndedAtIsNull();
}
