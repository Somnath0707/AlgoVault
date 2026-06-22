# AlgoVault ⚡

AlgoVault is a personal competitive programming operating system. It tracks your LeetCode history, identifies your weaknesses, and tells you exactly what you need to solve to improve. 

No AI. No social features. Just hard deterministic analytics.

## Architecture
- **Chrome Extension**: React, Tailwind CSS, Plasmo. Injects native UI into LeetCode.
- **Backend**: Java 21, Spring Boot 3, PostgreSQL, Redis. Handles complex mathematical modeling (Topic Elo, Mastery, Spaced Repetition).

## Features
- **Solve Probability Engine**: Predicts your chance of solving any problem based on historical metrics.
- **Contest Analyzer**: Deterministic tracking of Panic/Choking indices during contests.
- **Spaced Repetition**: Modified SM-2 algorithm ensures you never forget tricky patterns.
- **Private Vault**: Editor-like UI for storing and searching markdown notes.
- **Native Injection**: Seamlessly integrates into LeetCode without feeling intrusive.

## Setup
### Backend
1. Ensure PostgreSQL and Redis are running.
2. `cd backend && mvn spring-boot:run`
### Extension
1. `cd extension && npm install`
2. `npm run dev`
3. Load unpacked extension from `extension/build/chrome-mv3-dev`.
