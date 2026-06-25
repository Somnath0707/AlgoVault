package com.algovault.service;
import com.algovault.model.VaultEntry;
import com.algovault.model.User;
import com.algovault.repository.VaultEntryRepository;
import com.algovault.repository.UserRepository;
import com.algovault.repository.ProblemRepository;
import com.algovault.model.Problem;
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
    private final ProblemRepository problemRepository;

    @Cacheable(value = "vault", key = "#userId + '-' + #query")
    public List<VaultEntry> searchVault(Long userId, String query) {
        if (query == null || query.isBlank()) {
            return repository.findByUserIdOrderByUpdatedAtDesc(userId);
        }
        return repository.searchForUser(userId, query);
    }

    @CacheEvict(value = "vault", allEntries = true)
    public VaultEntry saveEntry(Long userId, VaultEntry entry) {
        User user = userRepository.findById(userId).orElseThrow();
        entry.setUser(user);

        if (entry.getProblem() != null && entry.getProblem().getTitleSlug() != null) {
            Problem problem = problemRepository.findByTitleSlug(entry.getProblem().getTitleSlug())
                .orElseGet(() -> problemRepository.save(Problem.builder()
                    .titleSlug(entry.getProblem().getTitleSlug())
                    .title(entry.getTitle() != null ? entry.getTitle() : entry.getProblem().getTitleSlug())
                    .build()));
            entry.setProblem(problem);
        }

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
