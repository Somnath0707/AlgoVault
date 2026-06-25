package com.algovault.repository;
import com.algovault.model.VaultEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VaultEntryRepository extends JpaRepository<VaultEntry, Long> {
    List<VaultEntry> findByUserIdOrderByUpdatedAtDesc(Long userId);
    @Query("""
        select entry from VaultEntry entry
        where entry.user.id = :userId
          and (
            lower(entry.content) like lower(concat('%', :query, '%'))
            or lower(coalesce(entry.tags, '')) like lower(concat('%', :query, '%'))
          )
        order by entry.updatedAt desc
        """)
    List<VaultEntry> searchForUser(@Param("userId") Long userId, @Param("query") String query);
    Integer countByUserId(Long userId);
}
