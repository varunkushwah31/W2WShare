# W2W-Share Production Deployment Guide (Render + Vercel)

Complete production deployment guide for running **W2W-Share** with:
- **Backend (Spring Boot / Java 25 / WebSockets)** → **[Render](https://render.com)** (Docker Web Service)
- **Frontend (React 19 / Vite / TailwindCSS v4)** → **[Vercel](https://vercel.com)** (Edge Static CDN)

---

## Architecture Overview

```
 ┌────────────────────────┐                   ┌────────────────────────┐
 │   Vercel (Frontend)    │                   │    Render (Backend)    │
 │ https://app.vercel.app │                   │ https://api.render.com │
 └───────────┬────────────┘                   └───────────┬────────────┘
             │                                            │
             │   1. REST API (/api/transfer/...)          │
             ├───────────────────────────────────────────►│
             │   2. WebSockets (wss://api.render.com/ws)  │
             ├───────────────────────────────────────────►│
             │                                            │
             ▼                                            ▼
   [ Sender Browser ]  ◄════════════════════════════►  [ Receiver Browser ]
                          WebRTC RTCDataChannel
                         (Direct P2P High-Speed)
```

---

## Part 1: Deploy Backend to Render

### Option A: Using Render Blueprints (Fastest & Recommended)
1. Push your repository to **GitHub** or **GitLab**.
2. Log in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your `W2WShare` repository.
5. Render will automatically read `render.yaml` and configure the Web Service with Docker.
6. Click **Apply**.
7. Once deployed, note your service URL (e.g. `https://w2w-share-backend.onrender.com`).

### Option B: Manual Web Service Setup on Render
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   - **Name**: `w2w-share-backend` (or your choice)
   - **Language / Runtime**: `Docker`
   - **Branch**: `main`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free` (or `Starter`)
4. In **Environment Variables**, add:
   | Key | Value | Description |
   |-----|-------|-------------|
   | `PORT` | `8080` | Container HTTP/WS port |
   | `CORS_ALLOWED_ORIGINS` | `https://*.vercel.app,https://*.vercel.dev` | Permits Vercel frontend |
   | `FRONTEND_URL` | `https://your-frontend-app.vercel.app` | (Add after Vercel deployment) |
   | `JAVA_OPTS` | `-XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -XX:MaxRAMPercentage=75.0 -Dspring.threads.virtual.enabled=true` | Dynamic container RAM scaling |
5. Click **Create Web Service**.
6. Wait for the Docker build to complete. Copy your backend URL:
   `https://w2w-share-backend.onrender.com`

> [!NOTE]
> **Render Free Tier Spin-Down**: Free-tier web services on Render spin down after 15 minutes of inactivity. When a new transfer session is initialized after inactivity, Render will take ~30–50 seconds to boot the container (cold start). Once warm, responses are instantaneous.

---

## Part 2: Deploy Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `W2WShare` repository.
4. In the project configuration screen:
   - Click **Edit** next to **Root Directory** and select `frontend` (this is required because frontend code lives in the `frontend/` directory).
   - Vercel will automatically detect the **Vite** framework preset and read `frontend/vercel.json`.
5. Under **Environment Variables**, add:
   | Key | Value | Example |
   |-----|-------|---------|
   | `VITE_API_URL` | `https://<YOUR_RENDER_BACKEND>.onrender.com/api` | `https://w2w-share-backend.onrender.com/api` |
   | `VITE_BACKEND_URL` | `https://<YOUR_RENDER_BACKEND>.onrender.com` | `https://w2w-share-backend.onrender.com` |
   | `VITE_WS_URL` | `wss://<YOUR_RENDER_BACKEND>.onrender.com/ws/signaling` | `wss://w2w-share-backend.onrender.com/ws/signaling` |
   *(Use your actual Render backend URL from Part 1)*
6. Click **Deploy**.
7. Copy your deployed frontend URL:
   `https://your-frontend-app.vercel.app`

---

## Part 3: Link Frontend & Backend

1. Return to your **Render Web Service Dashboard**.
2. Go to **Environment** tab.
3. Update:
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`
   - `CORS_ALLOWED_ORIGINS`: `https://your-frontend-app.vercel.app,https://*.vercel.app`
4. Click **Save Changes**. Render will automatically redeploy with the updated origins.

---

## Part 4: Runtime Backend Override (No Rebuild Needed)

If you deployed the frontend to Vercel before deploying the backend, or need to switch between local and production backends:
1. Open your browser console on your Vercel deployment:
   ```javascript
   localStorage.setItem('w2w_backend_url', 'https://your-backend.onrender.com')
   location.reload()
   ```
2. The application will instantly connect to that backend for all REST calls and WebSocket signaling.
3. To clear the override:
   ```javascript
   localStorage.removeItem('w2w_backend_url')
   location.reload()
   ```

---

## Post-Deployment Verification Checklist

1. **Backend Health Check**:
   Visit `https://your-backend-app.onrender.com/actuator/health` in your browser.
   Expected response:
   ```json
   {"status":"UP"}
   ```

2. **Backend Network Diagnostics**:
   Visit `https://your-backend-app.onrender.com/api/network/info` in your browser.
   Expected response:
   ```json
   {"status":"ONLINE_LOCAL","primaryUrl":"...","interfaces":[...]}
   ```

3. **Frontend Application & QR Codes**:
   - Open `https://your-frontend-app.vercel.app`.
   - Verify that the drafting table UI, cryptographic HUD, and peer radar load cleanly.
   - Click **Mobile App (PWA)** in the navigation header: verify that the QR code renders immediately client-side.

4. **Live End-to-End Transfer Test**:
   - **Device A (Sender)**: Open `https://your-frontend-app.vercel.app`. Drop a file into the upload zone and click **Initialize Transfer Session**.
   - Note the generated 6-digit PIN (e.g. `482910`).
   - **Device B (Receiver)**: Open `https://your-frontend-app.vercel.app` on a phone or separate browser. Click **Claim Transfer by PIN**, enter the 6-digit PIN, and click Claim.
   - Watch the WebRTC direct P2P DataChannel handshake and instant encrypted file streaming!

---

## Part 5: Keep Backend Active 24/7 (Prevent Render Sleep)

Render's free tier spins down web services after **15 minutes of inactivity**, causing a 30–50 second cold start delay on the next visit. W2W-Share includes an automated GitHub Actions keep-alive workflow to keep your Render instance warm around the clock.

### 1. Configure Your Backend URL in GitHub

1. In your GitHub repository, navigate to **Settings** → **Secrets and variables** → **Actions**.
2. Under the **Variables** tab (or **Secrets** tab), click **New repository variable**.
3. Add your backend URL:
   - **Name**: `RENDER_APP_URL`
   - **Value**: `https://your-service-name.onrender.com` (your actual Render URL)
4. (Optional) Add your frontend URL:
   - **Name**: `VERCEL_APP_URL`
   - **Value**: `https://your-app.vercel.app`

### 2. Automated Workflow (`.github/workflows/keep-render-alive.yaml`)

- **Schedule**: Triggers automatically every **10 minutes** (`cron: '*/10 * * * *'`). This ensures traffic arrives before Render's 15-minute idle timeout, even if GitHub Actions experiences minor queue jitter.
- **Health Checks**: Sends a lightweight heartbeat to `/actuator/health` (and fallback to `/`), keeping the JVM container hot and ready for instantaneous WebSockets and WebRTC handshakes.
- **Manual Ping**: You can trigger the heartbeat manually at any time under the **Actions** tab → **Keep Render & Services Alive** → **Run workflow** (with optional custom URL input).

### 3. External Free Cron Job Setup (Recommended Backup)

GitHub Actions suspends scheduled cron workflows if a repository has no commit activity for 60 consecutive days. Setting up an external free cron job ensures your Render backend never sleeps, running 24/7/365 independently.

#### Option A: cron-job.org (Recommended - 100% Free Forever)

1. Register a free account at [cron-job.org](https://cron-job.org).
2. Go to the **Cronjobs** tab and click **Create Cronjob**.
3. Configure the job:
   - **Title**: `W2W-Share Backend Keep-Alive`
   - **URL**: `https://<YOUR-RENDER-SERVICE-NAME>.onrender.com/actuator/health`
   - **Execution Schedule**: Select **Every 10 minutes** (or custom cron `*/10 * * * *`).
   - **Request Method**: `GET`
   - **Failure Notifications**: Check the box to receive email alerts if your service goes down.
4. Click **Create**. The service begins pinging every 10 minutes immediately.

#### Option B: UptimeRobot (Free 5-Minute Monitoring)

1. Register a free account at [uptimerobot.com](https://uptimerobot.com) (free plan includes 50 monitors).
2. Click **+ Add New Monitor**.
3. Configure the monitor:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `W2W-Share Backend`
   - **URL (or IP)**: `https://<YOUR-RENDER-SERVICE-NAME>.onrender.com/actuator/health`
   - **Monitoring Interval**: `5 minutes`
   - **Monitor Timeout**: `30 seconds`
4. Select your email under **Alert Contacts to Notify** and click **Create Monitor**.
5. UptimeRobot will ping the health endpoint every 5 minutes and track uptime status.

---

## Local Development

```bash
# Terminal 1: Backend
mvn spring-boot:run

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` and proxies `/api` and `/ws` to `http://localhost:8080`.
