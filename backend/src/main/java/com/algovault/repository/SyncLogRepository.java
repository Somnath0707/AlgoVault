package com.algovault.repository;
import com.algovault.model.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {}
