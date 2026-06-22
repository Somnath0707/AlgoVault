# Architecture Documentation

## Core Engines

### 1. Solve Probability Engine
Estimates probability using three weighted factors:
- **Baseline Match**: User's success rate in the problem's rating bucket (+/- 100).
- **Mastery Correlation**: User's `MasteryScore` for the problem's specific tags.
- **Difficulty Gap**: Distance between the user's `virtual_rating` and the problem's `actual_rating`.

### 2. Topic Elo Engine
Simulates a zero-sum game between the user and LeetCode problems.
- If the user gets AC on first try: Score = 1.0
- If the user gets AC eventually: Score = 0.7
- If the user fails: Score = 0.0
- Uses standard Elo formula with dynamic K-factors (K=32 for early problems, K=16 for established topics).

### 3. Spaced Repetition Engine
Modified SM-2 Algorithm.
- Calculates `next_review` date using `interval_days * ease_factor`.
- **Modifiers**: 
    - Weak mastery tags reduce the interval by 20%.
    - Problems failed during a contest reduce the interval by 30%.
