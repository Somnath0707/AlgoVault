# AlgoVault

AlgoVault is a self-hosted performance telemetry, rating estimation, and algorithmic mastery tracker for competitive programmers. It operates via a lightweight Chrome Extension (MV3) that intercepts and collects problem statistics, backed by a Spring Boot analysis service that models your cognitive skill levels per topic.

---

## ⚡ System Architecture

```mermaid
graph TD
    subgraph Browser Context (leetcode.com)
        MAIN[MAIN World: Fetch Interceptor]
        ISOLATED[ISOLATED World: session-tracker.ts]
        UI[Plasmo React UI: profile-overlay.tsx]
    end

    subgraph Local Server
        SRV[Spring Boot Web Service]
        DB[(PostgreSQL Database)]
    end

    MAIN -->|window.postMessage| ISOLATED
    ISOLATED -->|chrome.runtime| SRV
    UI -->|API Requests| SRV
    SRV <---> DB
```

### 1. The Interception Pipeline
- **Fetch Injection**: Injected directly into the `MAIN` execution world to capture raw submission responses.
- **World Crossing**: Uses `window.postMessage` to pass serialized payloads across the isolated context boundary, avoiding CSP blocks.
- **State Serialization**: Session tracker records focus metrics, copy/paste keyboard events, and tab switches into local storage states.

### 2. The Analytical Core
- **Topic Elo Rating System**: Models problem difficulty and user mastery as a zero-sum game. Solves increment rating, failures reduce it, and tags use dynamic K-factors based on topic frequency.
- **Expected Solve Probability**: A logistics-based probability solver calculating your chance of solving any problem using ZeroTrac historical ratings.
- **Spaced Repetition (SM-2 Modified)**: Scheduled intervals adjusted by tag mastery weights and contest failure flags.

---

## 🛠️ Tech Stack & Directory Structure

```
├── /extension     # Manifest V3 Extension (Plasmo, React 18, Tailwind, TS)
└── /backend       # Web Service (Spring Boot 3.3.0, Flyway, Hibernate, PostgreSQL)
```

- **Frontend**: Plasmo 0.89, React 18, Tailwind CSS, Recharts.
- **Backend**: Spring Boot 3.3, Hibernate, Flyway Migrations, PostgreSQL 14.

---

## 🚀 Setup & Deployment

### 1. Database Initialization
Ensure PostgreSQL is running on port `5432` with a database named `algovault`:
```bash
createdb algovault
```

### 2. Start the Backend
Execute the Spring Boot service:
```bash
cd backend
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home # or your Java 17 path
mvn spring-boot:run
```

### 3. Load the Extension
Compile the extension locally:
```bash
cd extension
npm install
npm run build
```
1. Open `chrome://extensions` in Google Chrome.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select `extension/build/chrome-mv3-prod/` (or `chrome-mv3-dev/` if running `npm run dev`).
