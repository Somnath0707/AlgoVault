package com.algovault.engine;

import org.springframework.stereotype.Component;

@Component
public class EloEngine {
    public int calculateNewElo(int currentElo, int problemRating, double score, int gamesPlayed) {
        double expected = 1.0 / (1.0 + Math.pow(10, (problemRating - currentElo) / 400.0));
        int K = gamesPlayed < 30 ? 32 : 16;
        return currentElo + (int) Math.round(K * (score - expected));
    }
}
