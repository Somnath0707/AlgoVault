# ⚡ AlgoVault
> **Your Competitive Programming Operating System.**

AlgoVault is a self-hosted performance telemetry, rating estimation, and algorithmic mastery tracker. It works via a lightweight, high-performance Chrome Extension (MV3) that intercepts and collects problem statistics in real-time, backed by a Spring Boot analysis service that models your cognitive skill levels per topic.

---

## 🌟 Key Features

*   **Real-Time Telemetry:** Tracks contest submissions, time-spent, tab-switches, and code-pasting events directly on LeetCode without any annoying API polling.
*   **Intelligent Overlays:** Injects beautiful UI overlays (Contest lifecycle updates, expected solve probabilities, and personal topic masteries) directly onto LeetCode pages.
*   **Topic ELO Rating System:** Evaluates your problem-solving proficiency per tag (e.g., Dynamic Programming, Graphs) as a zero-sum game. Solved problems increase your rating; failed problems decrease it.
*   **Expected Solve Probability:** A logistic-based math solver calculating your chance of solving any problem using ZeroTrac rating systems.
*   **Spaced Repetition (Modified SM-2):** Schedules smart problem reviews adjusted by tag mastery weights and contest failure history.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Browser Context (leetcode.com)
        MAIN[MAIN World: Fetch Interceptor]
        ISOLATED[ISOLATED World: Telemetry Scripts]
        UI[Plasmo React UI: Overlays]
    end

    subgraph AlgoVault Local Server
        SRV[Spring Boot Web Service]
        Redis[(Redis Cache)]
        DB[(PostgreSQL Database)]
    end

    subgraph External Platforms
        LC[LeetCode REST/GraphQL APIs]
        EH[EntrantHub API Proxy]
    end

    MAIN -->|window.postMessage| ISOLATED
    ISOLATED -->|chrome.runtime| SRV
    UI -->|API Requests| SRV
    SRV <---> DB
    SRV <---> Redis
    SRV -->|History / Ranks| LC
    SRV -->|Predictions| EH
```

### The Analytical Core
*   **Submission Relay:** Direct interception of `/submit` payloads and `/check` polling responses directly from the browser's raw network layer.
*   **Anti-Cheat Telemetry:** Uses keyboard event analysis to evaluate typing behavior (manual typing vs. copy-paste detection) and window focus tracking.

---

## 🛠️ Repository structure

```text
├── /extension     # Manifest V3 Extension (Plasmo, React 18, TailwindCSS, TS)
├── /backend       # Web Service (Spring Boot 3.3, Flyway Migrations, Hibernate, PostgreSQL)
└── docker-compose.yml  # Docker Compose environment for Local Databases and Services
```

---

## 🚀 Setup & Deployment

### Method A: Quick Start (Docker Compose)
If you have Docker installed, you can start the entire backend service database stack in one command:

1. Clone the repository and navigate to the folder:
   ```bash
   cd ChromeExtension
   ```
2. Start the database and cache services:
   ```bash
   docker-compose up -d postgres redis
   ```
3. Run the Spring Boot application (detailed below).

---

### Method B: Manual Developer Setup

#### 1. Setup the Database
Create the `algovault` database in your local PostgreSQL instance:
```bash
createdb algovault
```

#### 2. Start the Backend Service
Execute the Spring Boot service:
```bash
cd backend
# Explicitly set Java 17+ or ensure it is in your path
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home 
mvn spring-boot:run
```
The server will start on `http://localhost:8080`.

#### 3. Build & Install the Extension
The Chrome Extension is built using Plasmo.

1. Install dependencies:
   ```bash
   cd extension
   npm install
   ```
2. Run the production build:
   ```bash
   npm run build
   ```
3. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable **Developer Mode** (toggle top-right).
   - Click **Load Unpacked**.
   - Select the `extension/build/chrome-mv3-prod/` directory.

---

## 🧮 Mathematical Modeling

### Expected Solve Probability
We model the probability $P$ of a user solving a problem of difficulty rating $R_p$ with a personal rating $R_u$ using the logistic function:

$$P(\text{solve}) = \frac{1}{1 + 10^{\frac{R_p - R_u}{400}}}$$

### Topic ELO Rating Update
Upon solving or failing a problem with rating $R_p$, your topic rating $R_u$ updates via:

$$R_u^{\text{new}} = R_u^{\text{old}} + K \times (\text{Score} - P(\text{solve}))$$

*   $\text{Score} = 1.0$ (Success) or $0.0$ (Failure).
*   $K$ is a dynamic scaling factor based on the number of completed problems in the category.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
