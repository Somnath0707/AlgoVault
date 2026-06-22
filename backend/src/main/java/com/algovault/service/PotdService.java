package com.algovault.service;
import com.algovault.dto.PotdResponse;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PotdService {
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "potd", key = "#userId")
    public List<PotdResponse> getPotd(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        int ceiling = user.getVirtualRating() != null ? user.getVirtualRating() : 1500;

        List<PotdResponse> result = new ArrayList<>();
        
        // This is a simplified deterministic selection for Sprint 5.
        // WARMUP: 200 points below ceiling
        Problem p1 = problemRepository.findAll().stream()
            .filter(p -> p.getActualRating() != null && Math.abs(p.getActualRating() - (ceiling - 200)) < 50)
            .findFirst().orElse(null);
            
        if (p1 != null) {
            result.add(PotdResponse.builder()
                .title(p1.getTitle())
                .titleSlug(p1.getTitleSlug())
                .rating(p1.getActualRating())
                .tags(p1.getTags())
                .reason("A quick warmup below your ceiling to build momentum.")
                .type("WARMUP")
                .build());
        }

        // STRETCH: 100 points above ceiling
        Problem p3 = problemRepository.findAll().stream()
            .filter(p -> p.getActualRating() != null && Math.abs(p.getActualRating() - (ceiling + 100)) < 50)
            .findFirst().orElse(null);
            
        if (p3 != null) {
            result.add(PotdResponse.builder()
                .title(p3.getTitle())
                .titleSlug(p3.getTitleSlug())
                .rating(p3.getActualRating())
                .tags(p3.getTags())
                .reason("Push your rating ceiling. This is slightly above your comfort zone.")
                .type("STRETCH")
                .build());
        }

        return result;
    }
}
