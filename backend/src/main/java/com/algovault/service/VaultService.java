package com.algovault.service;
import com.algovault.model.VaultEntry;
import com.algovault.model.User;
import com.algovault.repository.VaultEntryRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VaultService {
    private final VaultEntryRepository repository;
    private final UserRepository userRepository;

    @Cacheable(value = "vault", key = "#userId + '-' + #query")
    public List<VaultEntry> searchVault(Long userId, String query) {
        if (query == null || query.isBlank()) {
            return repository.findByUserIdOrderByUpdatedAtDesc(userId);
        }
        return repository.findByUserIdAndContentContainingIgnoreCaseOrTagsContainingIgnoreCase(userId, query, query);
    }

    @CacheEvict(value = "vault", allEntries = true)
    public VaultEntry saveEntry(Long userId, VaultEntry entry) {
        User user = userRepository.findById(userId).orElseThrow();
        entry.setUser(user);
        return repository.save(entry);
    }
    
    @CacheEvict(value = "vault", allEntries = true)
    public void deleteEntry(Long userId, Long entryId) {
        VaultEntry entry = repository.findById(entryId).orElseThrow();
        if (entry.getUser().getId().equals(userId)) {
            repository.delete(entry);
        }
    }
}
