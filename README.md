# Secret Calculator Connected Application

**Enterprise POS, Agent Hierarchy & Administration Management Platform**  
*Release Version 1.0.0-PROD | Build 2026.11.07*

---

## 1. System Overview & Architecture

The **Secret Calculator Connected Application** is an end-to-end full-stack platform featuring:
- **Camouflage Layer (Secret Calculator):** A dark OLED standard arithmetic calculator that conceals the internal business platform behind an exact secret trigger (`11 + 22 =`).
- **Main Agent / Sub-dealer Interface:** A high-speed POS booking system featuring dynamic color-themed dashboards, real-time exposure limits, game allocations, and detailed financial reports.
- **Main Admin Interface:** A dedicated governance console with 4 dynamic KPI cards, agent management, progressive draw results publishing, prize configuration, and schedule controls.

### Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Capacitor
- **Backend:** Node.js, Express, TypeScript (clean layered architecture)
- **Database:** Normalized PostgreSQL (dual-mode: connection pooling for external Postgres + embedded `@electric-sql/pglite` engine for self-contained execution)
- **Packaging:** Capacitor Android APK, Responsive Mobile Web, and PWA

---

## 2. Default Seed Accounts

The platform initializes with a clean ledger (zero prefilled/fake bookings) and the following accounts:

| Role | Username | Password | Features & Scope |
| :--- | :--- | :--- | :--- |
| **Admin A** | `admin` | `admin` | Master governance: 4 summary cards, Agent B management, progressive draw results, prize configuration, draw controls |
| **Agent B** | `agent` | `agnet` | Full control over sub-dealers: Create/Edit/Deactivate/Delete sub-dealers, ticket & wholesale prices, allocations, booking repetition limits, blocked numbers, daily sales limits, subordinate daily reports |
| **Sub-dealer C** | `test` | `test` | All games enabled (`DR1`, `KL`, `DR6`, `DR8`), Number Booking, Last Sale, Sales Report, Winning Report, Daily Report, Results, Commissions. Empty ledger ready for manual booking |

*Note: The test credentials are for development and testing only. Admin A can delete the test account at any time, which revokes login access immediately while preserving historical accounting records and usernames.*

---

## 3. Secret Trigger & Application Flow

```
Secret Calculator ("Calculator")
     │
     ▼ (Enters: 11 + 22 =)
Main Login Screen (/api/auth/login)
     │
     ├───► If Role = ADMIN ───► Admin A Console (Dashboard 4 Cards, Agents, Results, Prizes, Draws)
     │
     └───► If Role = SUBDEALER / AGENT ───► GAMES #1 Selection
                                                │
                                                ▼ (Tap DR1, KL, DR6, or DR8)
                                           Number Booking (Active Game Theme Applied)
                                                │
                                                ├── Number Booking
                                                ├── Last Sale
                                                ├── Sales Report (Full View ON/OFF, All Game)
                                                ├── Winning Report (Prize, DC)
                                                ├── Daily Report (Bal = Win − Sale, Day Total)
                                                ├── Result Page (1st-5th, 3-column Complementary)
                                                ├── My Commission (S COM + WIN C = TOTAL)
                                                └── Manage Sub Dealer (Agent B)
```

### Mandatory Automatic Logout Behavior
Whenever a user exits the application, closes the tab/app, minimizes to background, or restarts the device:
1. The active session is invalidated on the server and wiped from memory.
2. The view resets immediately to the **Secret Calculator**.
3. Returning requires entering the secret expression `11 + 22 =` followed by manual login.

---

## 4. Draw Schedules & Automated Next-Day Cycle

All draw operations adhere to the **Asia/Kolkata (IST)** timezone:

| Game Code | Scheduled Closing Time | Color Code |
| :--- | :--- | :--- |
| **DR1** | 1:00 PM (13:00 IST) | Red (`#e53e3e`) |
| **KL** | 3:00 PM (15:00 IST) | Green (`#38a169`) |
| **DR6** | 6:00 PM (18:00 IST) | Magenta (`#d53f8c`) |
| **DR8** | 8:00 PM (20:00 IST) | Blue (`#3182ce`) |

- When a draw reaches its closing time or is manually closed by Admin A, bookings for today's draw lock automatically.
- Any subsequent booking made after closing is automatically assigned to **tomorrow's draw**.
- When Admin A publishes results, automated win reconciliation recalculates prize awards and dealer commissions (`DC`) across all active bills.

---

## 5. Development & Execution Runbook

### 5.1 Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js v26.10.0 and npm 11.19.1)
- Windows / macOS / Linux

### 5.2 Development Setup
1. Clone / open the workspace:
   ```bash
   cd "secrete calculator"
   ```
2. Install all dependencies across workspaces:
   ```bash
   npm install
   ```
3. Start both backend API (Port 5000) and frontend (Port 3000):
   ```bash
   npm run dev
   ```
4. Access the application:
   - Web App: `http://localhost:3000`
   - API Health Check: `http://localhost:5000/api/health`

### 5.3 Automated Test Execution
Run the comprehensive 15-suite test runner covering Calculator arithmetic, trigger security, authentication, business limits, and prize reconciliation:
```bash
npm test
```
*Result: 15 passed, 0 failed.*

---

## 6. Capacitor Android APK Packaging

The Android native project is fully configured in `frontend/android/`:
1. Build frontend distribution assets:
   ```bash
   npm run build --workspace=frontend
   ```
2. Sync assets with Capacitor:
   ```bash
   npx cap sync android --prefix frontend
   ```
3. Open in Android Studio or build debug APK via Gradle:
   ```bash
   cd frontend/android
   ./gradlew assembleDebug
   ```
   The generated APK will be located at:
   `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 7. Security & Compliance Checklist

- [x] **Strict Demo Mode:** Zero real-money wagers, deposits, payouts, or payments.
- [x] **Password Protection:** Strong salted bcrypt hashing for all stored credentials.
- [x] **Server-side RBAC:** Authentication middleware validates JWT, user active status, and database session validity on every protected route.
- [x] **Account Deactivation:** Immediately revokes all active session tokens.
- [x] **Historical Snapshot Integrity:** Soft deletion and `username_snapshot` preserve financial reports even if an account is deleted.
- [x] **Rate Limiting:** IP-based login rate limiting prevents brute-force attempts.
- [x] **SQL Injection Defense:** Fully parameterized queries across all database interactions.
