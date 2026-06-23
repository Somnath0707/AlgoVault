package com.algovault.repository;

import com.algovault.model.SessionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionEventRepository extends JpaRepository<SessionEvent, Long> {
}
