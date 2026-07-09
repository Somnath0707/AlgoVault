# ⚡ AlgoVault

> **Your Competitive Programming Operating System.**

AlgoVault is a self-hosted performance telemetry, rating estimation, and algorithmic mastery tracker. It works via a lightweight, high-performance Chrome Extension (Manifest V3) that intercepts and collects problem statistics in real-time, backed by a Spring Boot analysis service that models your cognitive skill levels per topic.

---

## 🏗️ Technical Stack & Architecture

```mermaid
graph TD
    subgraph "Browser Context (leetcode.com)"
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

### 💻 Chrome Extension (Manifest V3)
- **Framework:** [Plasmo](https://www.plasmo.com/) browser extension framework with React 18, TypeScript, and TailwindCSS.
- **Tactile 3D Badge cabinet:** Uses `framer-motion` for physical card translations (`preserve-3d` and `translateZ(24px)`) and responsive mouse-follow specular glare.
- **Analytics Charts:** Built using `recharts` but custom-engineered with a nested SVG shape callback (`NestedBarShape`) to draw solved bars inside attempted bars, bypassing default vertical grouping alignment bugs.

### ☕ Spring Boot Backend Service
- **Core Platform:** Spring Boot 3.3, Java 17+, Hibernate JPA, Maven.
- **Relational Storage:** PostgreSQL database managing users, submissions, tag masteries, contest results, and spaced repetition cards.
- **Migration Engine:** [Flyway Migrations](https://flywaydb.org/) executing sequence updates and indexes (`V1__create_users.sql` up to `V18__add_version_and_indexes.sql`).
- **Caching Layer:** Redis serving key-value caches for user sessions, dashboards, and live rating buckets.

---

## 🧮 Mathematical Modeling & Core Calculations

### 1. Expected Solve Probability (ZeroTrac Logistic Curve)
We model the probability $P$ of a user solving a problem of difficulty rating $R_p$ with a personal rating $R_u$ using the standard logistic function:

$$P(\text{solve}) = \frac{1}{1 + 10^{\frac{R_p - R_u}{400}}}$$

### 2. Topic ELO Rating Update
Upon solving or failing a problem with rating $R_p$, your topic rating $R_u$ updates via:

$$R_u^{\text{new}} = R_u^{\text{old}} + K \times (\text{Score} - P(\text{solve}))$$

*   $\text{Score} = 1.0$ (Success / Accepted) or $0.0$ (Failure / Rejected).
*   $K$ is a dynamic scaling factor based on the number of completed problems in the category to control rating volatility.

### 3. Spaced Repetition (Modified SM-2 Scheduling)
Schedulers compute the optimal interval $I$ in days for problem review based on card repetition count $n$, ease factor $EF$, and topic mastery values:

$$I(n) = \begin{cases} 
1 & n = 1 \\ 
6 & n = 2 \\ 
I(n-1) \times EF \times \theta_{\text{mastery}} & n > 2 
\end{cases}$$

*   $\theta_{\text{mastery}}$ represents a tag mastery coefficient that shortens the repetition intervals for weak topics and extends them for strong topics.

---

## 🛡️ Under-the-Hood Telemetry Core

### 1. Next.js Fetch & XHR Interception
To resolve loading delays caused by Plasmo's Parcel module loaders, the extension injects `assets/interceptor.js` directly as a script tag into the page DOM (`MAIN` world context) at `document_start`. This monkey-patches `window.fetch` and `XMLHttpRequest` synchronously before LeetCode's Next.js runtime mounts:
- Intercepts `/submissions/detail/.../check/` queries.
- Reads final submission results (e.g. `state: "SUCCESS"`, memory, runtime, compile errors).
- Relays payloads via `window.postMessage` using a cryptographically verified `nonce` to isolate the payload.

### 2. Cognitive Telemetry & Anti-Cheat
- **Manual Typing vs Copy-Paste:** Listens to keyboard event intervals (`keydown`) on code editors. Calculates characters per minute (CPM). Staging sudden block additions triggers copy-paste tracking.
- **Window Focus/Blur Heartbeats:** Logs focus switches (`tabSwitches`) to gauge context switching and attention drift during active problem solving.

---

## 🛠️ Step-by-Step Installation & Local Setup

### 1. Prerequisites
- **Java 17+** (e.g., Eclipse Temurin JDK 17)
- **Node.js 18+** & NPM
- **PostgreSQL** & **Redis** (Locally or via Docker Compose)
- **Maven** (optional, wrapper provided)

### 2. Database Initialization
Ensure PostgreSQL is running and create the `algovault` schema:
```bash
createdb algovault
```

### 3. Start Cache & Database via Docker Compose
If you prefer running Postgres and Redis inside Docker:
```bash
docker-compose up -d postgres redis
```

### 4. Running the Backend Service
1. Navigate to the `backend` directory.
2. Ensure `JAVA_HOME` points to JDK 17+.
3. Run the Spring Boot application (database migrations compile automatically via Flyway on startup):
```bash
cd backend
export JAVA_HOME=/path/to/jdk-17
mvn spring-boot:run
```
The backend service will run on `http://localhost:8080`.

### 5. Build and Install Chrome Extension
1. Navigate to the `extension` directory.
2. Install Node dependencies:
```bash
cd extension
npm install
```
3. Run the production build compiler:
```bash
npm run build
```
4. Load in Chrome:
   - Open `chrome://extensions/`
   - Toggle **Developer Mode** (top right).
   - Click **Load Unpacked**.
   - Select the directory `extension/build/chrome-mv3-prod/`.

---

## 📸 Visual Showcase & Feature Tour

### 📊 Performance Analytics & Dashboard
AlgoVault provides a unified dashboard showing your performance stats, streaks, active session time, and cognitive loading telemetry, integrating seamlessly directly into the Chrome Side Panel.

<p align="center">
  <img src="readme-images/extension_overall_showcase.png" alt="AlgoVault Overall Showcase" width="90%" />
</p>

<p align="center">
  <img src="readme-images/dashboard_1.png" alt="AlgoVault Dashboard" width="49%" />
  <img src="readme-images/dashboard_2.png" alt="Dashboard Metrics" width="49%" />
</p>

---

### 🎮 The Trophy Cabinet & Progress Heatmap
A premium display case designed with emotional craftsmanship featuring 3D badge parallax tilts and categorized layout shelves, paired with a dynamic height Solve vs Attempted categories comparison chart.
<p align="center">
  <img src="readme-images/trophy_cabinet.png" alt="Trophy Cabinet" width="49%" />
  <img src="readme-images/heatmap.png" alt="Solve vs Attempted Heatmap" width="49%" />
</p>

---

### 🏆 Interactive LeetCode Page Overlays
AlgoVault injects beautiful UI overlays directly onto LeetCode pages to track tags, difficulty ratings, solve probability, and target stats.
<p align="center">
  <img src="readme-images/rating_tags.png" alt="Problem Rating Tags" width="49%" />
  <img src="readme-images/rating_to_target.png" alt="Target Rating Metric" width="49%" />
</p>
<p align="center">
  <img src="readme-images/zerotrac_integration.png" alt="ZeroTrac Rating Integration" width="49%" />
  <img src="readme-images/hide_account.png" alt="Page Cleanup Tweaks" width="49%" />
</p>

---

### ⚔️ Contest Intelligence & Analytics
Track upcoming contests, monitor live contest performance metrics, and analyze your rating progression graph.
<p align="center">
  <img src="readme-images/upcoming_contests.png" alt="Upcoming Contests" width="49%" />
  <img src="readme-images/contest_performance.png" alt="Contest Performance Charts" width="49%" />
</p>
<p align="center">
  <img src="readme-images/contest_details.png" alt="Contest Details" width="49%" />
  <img src="readme-images/study_lists.png" alt="Study Lists" width="49%" />
</p>

---

### 🧠 Spaced Repetition & Weakness Identification
Reviews scheduled using a modified SM-2 algorithm aligned with your Tag Mastery values. Includes automatic detection of topic tags where your solve probability is low.
<p align="center">
  <img src="readme-images/topic_mastery.png" alt="Topic Mastery" width="49%" />
  <img src="readme-images/weakness.png" alt="Weakness Discovery" width="49%" />
</p>

---

### 🎬 Submission Celebration Overlays
Play Minecraft (Level Up / You Died) or GTA (Mission Passed / Wasted) themes with authentic sounds and overlays immediately on accepted/rejected submissions.
<p align="center">
  <img src="readme-images/mission_passed.png" alt="Mission Passed GTA Overlay" width="49%" />
  <img src="readme-images/mission_failed.png" alt="Wasted GTA Overlay" width="49%" />
</p>

---

### 🛡️ Telemetry, Anti-Cheat, & Settings
Tracks keyboard metrics (manual typing vs copy-paste detection), tab focus switches, and browser config panels.
<p align="center">
  <img src="readme-images/anti_cheat.png" alt="Anti-Cheat Analytics" width="49%" />
  <img src="readme-images/resources.png" alt="Resources Hub" width="49%" />
</p>
<p align="center">
  <img src="readme-images/settings_1.png" alt="Dashboard Sync Settings" width="49%" />
  <img src="readme-images/settings_2.png" alt="Celebration Overlay Config" width="49%" />
</p>

---

## 💾 Replay Evidence & Verification Files (Logs)

Verification walkthrough logs, redesign proposals, and checklist trackers generated during the architecture audits:
- **Redesign Blueprint:** [Trophy Cabinet Design Artifact](file:///Users/somnathghorpade/.gemini/antigravity/brain/3bdba3b2-baf3-4c71-8cae-f00709ce90b5/trophy_cabinet_redesign_proposal.md)
- **Checklist Tracker:** [Task list checklist](file:///Users/somnathghorpade/.gemini/antigravity/brain/3bdba3b2-baf3-4c71-8cae-f00709ce90b5/task.md)
- **Audit Walkthrough:** [walkthrough.md](file:///Users/somnathghorpade/.gemini/antigravity/brain/3bdba3b2-baf3-4c71-8cae-f00709ce90b5/walkthrough.md)

