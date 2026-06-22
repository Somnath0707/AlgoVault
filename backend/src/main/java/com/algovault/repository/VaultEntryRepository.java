package com.algovault.repository;
import com.algovault.model.VaultEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VaultEntryRepository extends JpaRepository<VaultEntry, Long> {
    List<VaultEntry> findByUserIdOrderByUpdatedAtDesc(Long userId);
    List<VaultEntry> findByUserIdAndContentContainingIgnoreCaseOrTagsContainingIgnoreCase(Long userId, String contentQuery, String tagsQuery);
    Integer countByUserId(Long userId);
}
