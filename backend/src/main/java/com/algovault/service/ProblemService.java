package com.algovault.service;

import com.algovault.model.Problem;
import com.algovault.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
public class ProblemService {
    private final ProblemRepository problemRepository;
    private final ZerotracService zerotracService;

    public Problem getOrCreate(String titleSlug, String title) {
        if (titleSlug == null || titleSlug.isBlank()) return null;
        Problem problem = problemRepository.findByTitleSlug(titleSlug).orElse(null);
        Double rating = null;
        if (problem == null || problem.getActualRating() == null) {
            rating = zerotracService.getRatingsBySlug().get(titleSlug);
        }
        if (problem == null) {
            String resolvedTitle = title != null && !title.isBlank() ? title : slugToTitle(titleSlug);
            problem = Problem.builder()
                .titleSlug(titleSlug)
                .title(resolvedTitle)
                .actualRating(rating)
                .build();
        } else if (problem.getActualRating() == null && rating != null) {
            problem.setActualRating(rating);
        }
        return problemRepository.save(problem);
    }

    private String slugToTitle(String slug) {
        if (slug == null || slug.isEmpty()) return "";
        String[] words = slug.split("-");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)))
                  .append(word.substring(1))
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }
}
