package com.algovault.repository;
import com.algovault.model.VaultEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VaultEntryRepository extends JpaRepository<VaultEntry, Long> {
    @EntityGraph(attributePaths = {"problem"})
    List<VaultEntry> findByUserIdOrderByUpdatedAtDesc(Long userId);
    @Query(value = """
        select * from vault_entries entry
        where entry.user_id = :userId
          and (
            lower(entry.title) like lower(concat('%', :query, '%'))
            or lower(entry.content) like lower(concat('%', :query, '%'))
            or lower(array_to_string(entry.tags, ',')) like lower(concat('%', :query, '%'))
          )
        order by entry.updated_at desc
        """, nativeQuery = true)
    List<VaultEntry> searchForUser(@Param("userId") Long userId, @Param("query") String query);
    Integer countByUserId(Long userId);
}
