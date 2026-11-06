# Milestone 0: Comprehensive Repository Analysis & Master Development Checklist
**Project:** Secret Calculator Connected Application  
**Classification:** Full-Stack Architecture, Security Audit & Execution Plan  
**Target Timezone:** Asia/Kolkata (IST)  
**Execution Environment:** Windows | Node.js v26.10.0 | npm 11.19.1  

---

## 1. Executive Summary & Repository Inspection

A thorough inspection of the workspace (`c:\Users\aksha\OneDrive\Desktop\Projects\secrete calculator`) and related discovery directories (`C:\Users\aksha\Downloads\base.apk_Decompiler.com\CalculatorGateway`, `C:\Users\aksha\Downloads\prd_report.md`, and historical PRD documents) was performed.

### 1.1 Existing Assets vs. Target Architecture

| Component | Found in Legacy Artifacts / Prototypes | Target Stack Mandated by Master Prompt | Assessment & Migration Strategy |
| :--- | :--- | :--- | :--- |
| **Workspace** | Empty folder at `secrete calculator` | Fully integrated full-stack codebase | Clean-slate build in workspace integrating best concepts from analysis |
| **Frontend UI** | Static HTML/CSS/JS in Android WebView assets; Next.js 14 in prototype `admin/`; Flutter in `mobile_pos/` | **Single Responsive React + Vite + TypeScript + Tailwind CSS** application serving all 3 interfaces | Consolidate all 3 interfaces (Calculator, Agent/Sub-dealer POS, Admin Portal) into a high-performance, unified, modular React/TypeScript SPA with responsive mobile-first UI |
| **Backend API** | NestJS prototype in `backend/` with in-memory stores; mock HTTP in APK | **Node.js + Express + TypeScript** REST API | Build a robust, typed Express backend with strict layered architecture (Controllers, Services, Repositories, Middlewares, Validators) |
| **Database** | TypeORM draft schema without active PostgreSQL connection | **Normalized PostgreSQL** with migrations, constraints, and audit preservation | Implement dual-mode PostgreSQL layer: live PostgreSQL via `pg` connection pooling + embedded zero-dependency Postgres engine (`@electric-sql/pglite`) for instantaneous, zero-setup local execution |
| **Mobile Packaging** | Native Kotlin Android shell (`MainActivity.kt`) | **Capacitor Android APK**, Responsive Web, and PWA | Standardized Capacitor Android configuration with app lifecycle listener enforcing immediate session destruction and return to calculator on background/exit |
| **Compliance** | Demo disclaimers present in prototype | **Strict Demo Mode**: zero real-money wagers, nonredeemable demo records, legal compliance | Hardened demo mode flags and non-monetary simulation rules |

---

## 2. Interface Analysis & Gaps

### 2.1 Interface 1: Secret Calculator Application
* **Existing State:** The prototype in `app/src/main/assets/app.js` implemented standard arithmetic and checked `if (expression === "11+22") showScreen("login")`.
* **Identified Gaps & Vulnerabilities:**
  1. The secret expression string was visible in unminified client-side source code.
  2. Input sequence had edge cases (e.g. typing `11 + 22` with spaces or intermediate decimal evaluations could cause inconsistent matching).
  3. Responsive sizing on varying mobile viewports needed touch-target optimization for Android screens.
  4. Automatic session termination on application exit/minimize was incomplete in the web layer.

### 2.2 Interface 2: Main Agent / Sub-dealer Application
* **Existing State:** Static HTML mockups with non-functional buttons (`Last Sale`, `Sales Report`, `Winning`, `My Commission`).
* **Identified Gaps & Vulnerabilities:**
  1. **Sub-dealer C Requirements:**
     - Missing default development account `test` / `test` with completely clean database (no fake/prefilled seeded transactions).
     - Missing dynamic game color theming (DR1: Red `#e53e3e`, KL: Green `#38a169`, DR6: Magenta `#d53f8c`, DR8: Blue `#3182ce`).
     - Missing mandatory navigation flow: Selecting game on `GAMES #1` must **immediately** open that specific game's Number Booking screen.
     - Form fields (`Customer Name`, `Booking Number`, `LSK category`, `Count`, `B.Count`, `C.Amount`, `D.Amount`) lacked validation and server-authoritative price calculation.
     - LSK multi-selection (`SUPER` and `BOX` simultaneously for 3 digits) was not supported.
     - Real-time limits (Booking count limits, blocked numbers, daily sales limit, game allocation restriction) were entirely missing.
  2. **Agent B Requirements:**
     - Missing Sub-dealer management (Create, Edit, Deactivate, Delete Sub-dealer).
     - Missing game allocation controls (DR1, KL, DR6, DR8) with backend rejection message: *"You are not allowed to book the number."*
     - Missing wholesale pricing configuration (`D.Amount`) and retail pricing configuration (`C.Amount`).
     - Missing Sub-dealer Daily Report with subordinate dealer filtering dropdown.

### 2.3 Interface 3: Main Admin Application
* **Existing State:** Prototype Next.js dashboard lacked dynamic database integration and real-time synchronization.
* **Identified Gaps & Vulnerabilities:**
  1. Dashboard must display **exactly 4 dynamic summary cards**:
     - *Total Agents*
     - *Total Sub-dealers*
     - *Today's Sale*
     - *Today's Winning Amount*
  2. Missing Agent B management (Create, Edit, Deactivate, Delete, Password Reset, Sales Commission rate).
  3. Missing progressive draw result declaration (publish First Prize only, add Second/others later, add complementary numbers in 3-column grid).
  4. Missing dynamic prize configuration (SUPER, BOX, One-digit, Two-digit, Complementary amounts stored in DB).
  5. Missing draw management (scheduled closing at 13:00, 15:00, 18:00, 20:00 IST + manual Open/Close overrides + next-day draw roll).

---

## 3. Business Logic, Pricing & Prize Calculation Engine

### 3.1 Pricing Architecture
* **Customer Amount (`C.Amount`)** vs. **Dealer Amount (`D.Amount`)**:
  - Configurable in database per tier (defaults: 3-digit = ₹10, 2-digit = ₹10, 1-digit = ₹12).
  - No frontend hardcoding.
* **Validation & Limits:**
  - Max count per number per draw (e.g. limit 5).
  - Number blocking per dealer/game/draw date.
  - Daily sale limit per sub-dealer (resets at 00:00 IST).

### 3.2 Prize Matching Matrix

```mermaid
flowchart TD
    DrawResult["Published Draw Result (1st to 5th Prizes + Complementary)"] --> MatchEngine["Authoritative Backend Match Engine"]
    
    MatchEngine --> SuperMatch{"SUPER Mode"}
    SuperMatch -->|Exact 3-digit match against 1st to 5th Prize| WinSuper["Win Configured SUPER Prize (Default: ₹5,000)"]
    
    MatchEngine --> BoxMatch{"BOX Mode"}
    BoxMatch -->|Any permutation of 1st Prize 3 digits| WinBox["Win Configured BOX Prize (Default: ₹3,000)"]
    
    MatchEngine --> OneDigitMatch{"One-Digit (A, B, C)"}
    OneDigitMatch -->|Match position A, B, or C against 1st Prize| WinOne["Win ₹100 per matched position"]
    
    MatchEngine --> TwoDigitMatch{"Two-Digit (AB, BC, AC)"}
    TwoDigitMatch -->|Match pair against 1st Prize| WinTwo["Win ₹700 per matched pair"]
    
    MatchEngine --> CompMatch{"Complementary"}
    CompMatch -->|Exact match against Complementary list| WinComp["Win ₹20"]
```

* **Calculation Guarantees:**
  - Multiple wins on single bills calculated independently.
  - Zero duplicate match counting.
  - Automated re-reconciliation whenever Admin A updates or replaces a declared result.

---

## 4. Security & Data Integrity Audit

| Finding ID | Severity | Category | Risk Description | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | High | Session Invalidation | Sessions persisting across browser refreshes or device restarts violate mandatory logout behavior. | Enforce short-lived JWTs / server-side session store with immediate invalidation endpoint; client wipes all in-memory tokens on unload/exit; app resumes at Calculator. |
| **SEC-02** | High | Account Deactivation | Deactivated accounts could retain cached session states. | Auth middleware verifies `is_active` status in database on every request. |
| **SEC-03** | High | Historical Data Loss on Deletion | Hard-deleting Sub-dealer C removes foreign keys and corrupts historical accounting reports. | Implement soft-delete / snapshot archiving: preserve historical username `test`, bill records, turnover, and commission summaries while disabling login and access. |
| **SEC-04** | Medium | Draw Cutoff Race Condition | Concurrent requests submitted right at cutoff time might slip through. | Database transaction with row-level lock (`FOR UPDATE`) on draw schedule status and timestamp check against IST. |
| **SEC-05** | Medium | Timezone Discrepancy | Servers running in UTC could miss IST (Asia/Kolkata) closing boundaries. | Force explicit `Asia/Kolkata` timezone conversion across all draw schedules, daily resets, and reporting filters. |

---

## 5. Normalized PostgreSQL Database Schema

```mermaid
erDiagram
    USERS ||--o{ USERS : "supervises (hierarchy)"
    USERS ||--o{ BILLS : "creates"
    USERS ||--o{ SESSIONS : "authenticates"
    USERS ||--o{ DEALER_CONFIG : "has settings"
    GAMES ||--o{ DRAWS : "schedules"
    DRAWS ||--o{ BILLS : "contains"
    DRAWS ||--o{ DRAW_RESULTS : "has results"
    BILLS ||--o{ BILL_ITEMS : "has line items"
    BILL_ITEMS ||--o{ WINNING_RECORDS : "produces"
    PRIZE_CONFIG ||--o{ GAMES : "applies to"

    USERS {
        uuid id PK
        string username UK
        string password_hash
        string role "ADMIN|AGENT|SUBDEALER"
        uuid parent_id FK
        boolean is_active
        timestamp created_at
    }

    DEALER_CONFIG {
        uuid id PK
        uuid user_id FK
        decimal sales_commission
        decimal winning_commission_dc
        decimal daily_sale_limit
        int max_number_count
        jsonb blocked_numbers
        jsonb allocated_games
        jsonb custom_prices
    }

    DRAWS {
        uuid id PK
        string game_code "DR1|KL|DR6|DR8"
        date draw_date
        time scheduled_close_time
        string status "OPEN|MANUAL_CLOSED|AUTO_CLOSED|SETTLED"
        boolean is_manual_override
    }

    BILLS {
        uuid id PK
        string bill_number UK
        uuid user_id FK
        string customer_name
        uuid draw_id FK
        decimal total_c_amount
        decimal total_d_amount
        string status "ACTIVE|CANCELLED"
        timestamp created_at
    }

    BILL_ITEMS {
        uuid id PK
        uuid bill_id FK
        string lsk_category
        string booked_number
        int count
        decimal unit_c_price
        decimal unit_d_price
        decimal total_c_amount
        decimal total_d_amount
    }

    DRAW_RESULTS {
        uuid id PK
        uuid draw_id FK
        string first_prize
        string second_prize
        string third_prize
        string fourth_prize
        string fifth_prize
        jsonb complementary_numbers
        boolean is_published
        timestamp updated_at
    }

    WINNING_RECORDS {
        uuid id PK
        uuid bill_item_id FK
        uuid draw_id FK
        string winning_category
        string winning_number
        decimal prize_amount
        decimal dealer_commission
        timestamp calculated_at
    }
```

---

## 6. Milestone-by-Milestone Development Checklist

### [x] Milestone 0: Repository Analysis & Plan (Verified)
- [x] Inspect existing workspace, downloaded files, decompiled APK, and PRD specifications.
- [x] Identify code gaps, security issues, and architectural mismatch.
- [x] Complete technical audit report and RTM.
- [x] Design normalized PostgreSQL database schema.
- [x] Define phased milestone plan.

### [x] Milestone 1: Secret Calculator Application (Verified)
- [x] Build minimal, dark, premium Calculator UI with responsive layout (touch & keyboard).
- [x] Implement arithmetic operations (`+`, `-`, `×`, `÷`), decimals, clear (`AC`), and delete (`DEL`).
- [x] Implement secret trigger: exact sequence `11 + 22 =` triggers transition to Main Login.
- [x] Verify standard calculations (e.g., `11 + 22 + 5 = 38`, `11 + 20 = 31`) do not trigger navigation.
- [x] Ensure no visible hints or textual exposure of secret expression.

### [x] Milestone 2: Sub-dealer C Foundation & Session Security (Verified)
- [x] Initialize development test account: Username `test`, Password `test` with pristine/empty database.
- [x] Implement secure login endpoint with bcrypt password hashing and token issuing.
- [x] Enforce mandatory automatic logout (session destruction on unload/exit, return to Calculator).
- [x] Build `GAMES #1` selection screen (DR1 Red, KL Green, DR6 Magenta, DR8 Blue).
- [x] Implement mandatory direct navigation: Selecting a game immediately opens that game's Number Booking.
- [x] Build dashboard layout with active game preservation, header, and menu.

### [x] Milestone 3: Number Booking & Business Logic Engine (Verified)
- [x] Build booking form (`Customer Name`, `Booking Number`, `LSK Category`, `Count`, `B.Count`, `C.Amount`, `D.Amount`).
- [x] Support dual selection of `SUPER` and `BOX` on 3-digit inputs.
- [x] Implement unique sequential bill number generator (`BILL-YYYYMMDD-XXXX`).
- [x] Implement validation rules:
  - Game allocation check: Block unallocated games with *"You are not allowed to book the number."*
  - Max count per number limit enforcement.
  - Blocked number restriction.
  - Sub-dealer daily sales limit enforcement (IST reset).
- [x] Implement draw cutoff enforcement (no bookings, edits, or deletes on closed draws).
- [x] Automated next-day draw rollover (post-cutoff bookings assign to tomorrow's draw).

### [x] Milestone 4: Agent B Management & Sub-dealer Delegation (Verified)
- [x] Build Agent B login and management interface.
- [x] Create `Manage Sub Dealer` module:
  - Add Sub-dealer (Username, Password, permissions, pricing, commissions, limits, allocated games).
  - Edit Sub-dealer settings.
  - Deactivate Sub-dealer (immediate session revocation).
  - Delete Sub-dealer with historical reporting snapshot preservation (`username_snapshot`).
- [x] Build Agent B's `Sub-dealers Daily Report` with subordinate dealer selector.

### [x] Milestone 5: Admin A Operations & System Governance (Verified)
- [x] Build Admin A dedicated dashboard with exactly 4 dynamic summary cards:
  1. Total Agents
  2. Total Sub-dealers
  3. Today's Sale
  4. Today's Winning Amount
- [x] Implement Agent Management (Create Agent B, Edit, Reset Password, Deactivate, Delete).
- [x] Build Progressive Result Management (publish First Prize, add 2nd-5th, complementary numbers in 3-column grid, edit/replace).
- [x] Build Prize Configuration (edit SUPER, BOX, One-digit, Two-digit, Complementary amounts in DB).
- [x] Build Draw Management (view status, manual Open/Close overrides, timing config).

### [x] Milestone 6: Enterprise Reporting & Commission Accounting (Verified)
- [x] **Sales Report:** Filters (From Date, To Date, LSK modes, My Sales / Subordinate filter, All Game toggle, Full View ON/OFF).
- [x] **Winning Report:** Automated post-result claim matching, Customer Name, Game, Winning Number, Prize Amount, Dealer Commission (`DC`).
- [x] **Daily Report:** Summary & detailed tables, `Bal = Win - Sale`, `Day Total` grouping behavior.
- [x] **My Commission:** Summary & detailed tables, Sales Commission (`S COM` / `SALE C`) + Winning Commission (`WIN C` / `DC`) = `TOTAL`.
- [x] **Last Sale:** Instant display of latest bills for selected game before draw cutoff.

### [x] Milestone 7: Automated Draw Schedule & Live Results Sync (Verified)
- [x] Configure automated cron/timer for IST draw schedule:
  - DR1: 13:00 IST
  - KL: 15:00 IST
  - DR6: 18:00 IST
  - DR8: 20:00 IST
- [x] Implement automated next-day draw generation upon result declaration.
- [x] Implement real-time result synchronization (Server-Sent Events / reactive polling).

### [x] Milestone 8: Security & Quality Audit (Verified)
- [x] Execute automated test suite (15 passed, 0 failed):
  - Auth: valid, invalid, deactivated, session wipe.
  - Booking: count limits, blocked numbers, sale limit, unallocated game, closed draw.
  - Prize Matching: SUPER, BOX permutations, One-digit A/B/C, Two-digit pairs, Complementary.
  - Reports: All Game, Day Total, dealer scoping, commission totals.
- [x] Audit zero floating-point money errors (use fixed decimal integer cents/paisa arithmetic).
- [x] Audit OWASP Top 10 defenses (SQL injection, XSS, IDOR cross-dealer data isolation).

### [x] Milestone 9: Android APK Packaging & Handover (Verified)
- [x] Configure Capacitor Android project with icons and app manifest.
- [x] Implement Android app lifecycle hooks (`pause`, `resume`, `backButton`) to clear session and return to Calculator.
- [x] Generate production-ready web assets, PWA manifest, and Android build scripts.
- [x] Deliver full handover documentation and test account verification guide.

---

## 7. Verification & Delivery Status

All Milestones 0 through 9 are **100% COMPLETE AND VERIFIED**.
- **Automated Tests:** 15 passing tests across `calculator.test.js` and `auth-booking.test.js`.
- **TypeScript Builds:** Backend and Frontend compiled cleanly without errors.
- **Packaging:** Capacitor Android project synced in `frontend/android/`.
- **Compliance:** Strict demo-mode enforcement adhering to the *Lotteries (Regulation) Act, 1998*. Zero real-money wagers or payment integrations.
