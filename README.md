# ⚡ AlgoVault

> **Your competitive programming operating system.**
> AlgoVault is a self-hosted performance telemetry, rating estimation, and algorithmic mastery tracker.

AlgoVault operates via a lightweight, high-performance Chrome Extension (MV3) that intercepts and collects problem statistics in real-time, backed by a Spring Boot analysis service that models your cognitive skill levels per topic.

---

## 🚀 Features

- **Real-Time Telemetry**: Seamlessly tracks your contest submissions, time spent, tab-switches, and code-paste events without polling APIs.
- **Cross-World Injection**: Advanced `MAIN` / `ISOLATED` world script communication bypasses CSP locks to capture raw WebSocket/Fetch events instantly.
- **Topic Elo Rating System**: Models problem difficulty and your personal mastery as a zero-sum game. Solves increment rating, failures reduce it, and tags use dynamic K-factors.
- **Expected Solve Probability**: A logistics-based probability solver calculating your chance of solving any problem using ZeroTrac historical ratings.
- **Spaced Repetition (SM-2 Modified)**: Intelligent review scheduling adjusted by tag mastery weights and contest failure flags.

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Browser Context (leetcode.com)
        MAIN[MAIN World: Fetch Interceptor]
        ISOLATED[ISOLATED World: Telemetry Scripts]
        UI[Plasmo React UI: Overlays]
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

### The Analytical Core
- **Submission Relay**: Directly intercepts the `/submit` payload and `/check` polling responses directly from the browser's raw network layer.
- **Contest Analysis**: Replays your GraphQL event telemetry to determine exact typing behaviors (manual typing vs. external large pastes) and context switching (tab-loss).

---

## 🛠️ Tech Stack 

```text
├── /extension     # Manifest V3 Extension (Plasmo, React 18, Tailwind, TS)
└── /backend       # Web Service (Spring Boot 3.3, Flyway, Hibernate, PostgreSQL)
```

## 🚀 Setup & Deployment

### 1. Database Initialization
Ensure PostgreSQL is running on port `5432` with a database named `algovault`:
```bash
createdb algovault
```

### 2. Start the Backend Engine
Execute the Spring Boot service:
```bash
cd backend
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home # Or your local JDK 17+
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
3. Click **Load unpacked** and select `extension/build/chrome-mv3-prod/`.
