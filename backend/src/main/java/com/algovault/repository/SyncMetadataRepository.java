package com.algovault.repository;
import com.algovault.model.SyncMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface SyncMetadataRepository extends JpaRepository<SyncMetadata, Long> {
    Optional<SyncMetadata> findByUserId(Long userId);
}
