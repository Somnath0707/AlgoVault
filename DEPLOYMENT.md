# Universal Production Deployment Guide

AlgoVault is architected to be **100% deploy-proof across any cloud or self-hosted platform**. It automatically adapts to cloud database URLs (`DATABASE_URL`), dynamically binds to assigned container ports (`PORT`), applies container-aware JVM memory ergonomics, and fails open safely if Redis is undergoing rolling updates.

---

## 1. Quick Overview

AlgoVault consists of two deployable components:
1. **Backend API**: Spring Boot 3.3 (Java 17/21) + PostgreSQL 16 + Redis (optional/fail-open).
2. **Chrome Extension**: Plasmo MV3 client compiled against your backend's final HTTPS URL.

> [!IMPORTANT]
> Always deploy the Backend API first. Once you have its live HTTPS URL (e.g. `https://api.yourdomain.com`), build the extension with that URL.

---

## 2. Platform 1: Railway (Recommended — 2 Minutes)

Railway automatically detects `railway.json` and provisions PostgreSQL in one click:

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo** and pick `AlgoVault`.
3. Click **+ New** -> **Database** -> **Add PostgreSQL**.
4. Railway automatically attaches `DATABASE_URL` to your project.
5. In your Backend Service settings, add these environment variables:
   - `JWT_SECRET`: (Click *Generate* or use 32+ random characters)
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App Client Secret
   - `CORS_ALLOWED_ORIGINS`: `chrome-extension://nglebofiomebgndkkdecnmolafjdphhf`
6. Click **Generate Domain** in the Networking section.
7. Verify by visiting `https://your-app.up.railway.app/health`. You will see `{"status":"UP"}`.

---

## 3. Platform 2: Render (1-Click Blueprint)

Render uses [`render.yaml`](render.yaml) to automatically provision the web service and managed PostgreSQL together:

1. Go to [Render Dashboard](https://dashboard.render.com) -> **Blueprints** -> **New Blueprint Instance**.
2. Connect your `AlgoVault` repository.
3. Render will read `render.yaml` and configure:
   - Web Service: `algovault-backend`
   - Database: `algovault-db` (Postgres 16)
4. Fill in the prompted values for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
5. Click **Apply**.
6. When deployment finishes, copy your Render HTTPS URL and verify `https://algovault-backend.onrender.com/health`.

---

## 4. Platform 3: Fly.io

Fly.io uses [`fly.toml`](fly.toml) for global edge deployment:

1. Install Fly CLI: `brew install flyctl` (or `curl -L https://fly.io/install.sh | sh`).
2. Login: `fly auth login`.
3. Launch Postgres:
   ```bash
   fly postgres create --name algovault-db --region iad --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 10
   ```
4. Deploy the backend app and attach database:
   ```bash
   fly launch --no-deploy
   fly postgres attach --app algovault-api algovault-db
   ```
5. Set secrets:
   ```bash
   fly secrets set \
     JWT_SECRET="$(openssl rand -hex 32)" \
     GITHUB_CLIENT_ID="your_client_id" \
     GITHUB_CLIENT_SECRET="your_client_secret" \
     CORS_ALLOWED_ORIGINS="chrome-extension://nglebofiomebgndkkdecnmolafjdphhf"
   ```
6. Deploy:
   ```bash
   fly deploy
   ```

---

## 5. Platform 4: Self-Hosted VPS (Docker Compose / Coolify / CapRover)

Deploy on any Linux VPS (Ubuntu, Debian, AlmaLinux, DigitalOcean, Hetzner, AWS EC2):

1. Clone repository to server:
   ```bash
   git clone https://github.com/Somnath0707/AlgoVault.git
   cd AlgoVault
   ```
2. Create production environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with a strong `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, and GitHub credentials.
3. Start all services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Put your domain behind Nginx or Caddy with SSL:
   ```caddy
   api.yourdomain.com {
       reverse_proxy 127.0.0.1:8080
   }
   ```
5. Check health:
   ```bash
   curl -I https://api.yourdomain.com/health
   ```

---

## 6. Platform 5: AWS (App Runner / ECS) & GCP (Cloud Run)

Both platforms use standard container images built from [`backend/Dockerfile`](backend/Dockerfile):

### Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/algovault-backend ./backend
gcloud run deploy algovault-backend \
  --image gcr.io/$PROJECT_ID/algovault-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgres://...", "JWT_SECRET=...", "GITHUB_CLIENT_ID=...", "GITHUB_CLIENT_SECRET=..."
```

### AWS App Runner
1. Push Docker image to Amazon ECR.
2. Create App Runner service from ECR image.
3. Set Port to `8080`, Health check path to `/health`.
4. Add environment variables for `DATABASE_URL`, `JWT_SECRET`, and GitHub credentials.

---

## 7. GitHub OAuth Application Configuration

Configure your OAuth application at [GitHub Developer Settings](https://github.com/settings/developers):

- **Application name**: AlgoVault
- **Homepage URL**: Your portfolio or GitHub repo URL
- **Authorization callback URL**:
  ```text
  https://nglebofiomebgndkkdecnmolafjdphhf.chromiumapp.org/
  ```

> [!NOTE]
> The manifest contains a fixed key in `extension/package.json`, ensuring the Extension ID (`nglebofiomebgndkkdecnmolafjdphhf`) and OAuth callback URL remain 100% constant across every build and device.

---

## 8. Building the Chrome Extension for Production

Once your backend API is live:

1. Open `extension/.env` (or copy from `extension/.env.production.example`):
   ```env
   PLASMO_PUBLIC_BACKEND_URL=https://your-api.example.com
   PLASMO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
   ```
2. Build and package the production release:
   ```bash
   cd extension
   npm run package:release
   ```
3. The release package checks:
   - Rejects localhost and non-HTTPS URLs.
   - Verifies the MAIN-world submission interceptor.
   - Syncs build outputs into `extension/build/chrome-mv3-prod/`.
   - Generates a production ZIP ready for the **Chrome Web Store**.

---

## 9. Pre-Flight Verification Script

Before deploying, you can run the automated pre-flight test anytime:
```bash
./scripts/verify-deployment.sh
```
This verifies all platform manifests, tests Java and TypeScript compilation, inspects container configs, and validates templates with zero human error.
