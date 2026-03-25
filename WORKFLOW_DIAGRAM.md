# FitFlow — Complete Workflow & Flowcharts

> All system flows, state machines, and process diagrams for FitFlow.

---

## 1. System Architecture

```mermaid
graph TB
    subgraph FE["Frontend — gym-app (Next.js 16)"]
        AUTH_PAGE["fa:fa-lock /auth"]
        USER_PAGES["fa:fa-user /(user)/*\nhome · today-workout · today-diet\nmy-attendance · reports · scan"]
        ADMIN_PAGES["fa:fa-shield /(admin)/*\ndashboard · users · payments\nattendance · leave · analytics"]
        HOOKS["useAuth · authFetch · useUserProgress"]
    end

    subgraph BE["Backend — fitflow-api (Express + TS)"]
        MW_AUTH["authenticate()"]
        MW_ADMIN["requireAdmin()"]
        MW_SUB["requireActiveSubscription()"]
        subgraph ROUTES["Route Handlers"]
            R_AUTH["auth"]
            R_ADMIN["admin"]
            R_ATT["attendance"]
            R_PLANS["plans"]
            R_LEAVE["leave"]
            R_PROG["progress"]
            R_CRON["cron"]
        end
        subgraph SERVICES["Services"]
            S_AI["workoutGenerationService\ndietGenerationService"]
            S_CRON["planSchedulerService"]
        end
    end

    subgraph INFRA["Infrastructure"]
        DB["MongoDB Atlas"]
        AI["OpenRouter API\nGroq / Gemini fallback"]
        CRON["Vercel Cron\n4 scheduled jobs"]
    end

    FE -->|"REST + Bearer JWT"| BE
    MW_AUTH --> MW_ADMIN
    MW_AUTH --> MW_SUB
    ROUTES --> SERVICES
    SERVICES --> AI
    BE --> DB
    CRON -->|"GET /api/cron/* + CRON_SECRET"| BE
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as Next.js
    participant BE as Express
    participant DB as MongoDB

    B->>FE: Open /auth
    FE->>B: Login form

    B->>BE: POST /api/auth/login (email + password)
    BE->>DB: Find user by email
    DB-->>BE: User document
    BE->>BE: bcrypt.compare(password, hash)

    alt Invalid credentials
        BE-->>B: 401 { ok: false }
    end

    BE->>BE: Sign accessToken (15m) + refreshToken (7d)
    BE-->>B: 200 { accessToken, refreshToken, user }
    B->>B: localStorage.setItem(tokens + user)
    B->>FE: Redirect → /home or /dashboard

    Note over B,BE: Every 30 seconds (useAuth interval)
    B->>B: Parse JWT expiry
    alt Token expires in < 2 min
        B->>BE: POST /api/auth/refresh { refreshToken }
        BE-->>B: New accessToken
    end

    Note over B,BE: On any 401 response (authFetch)
    BE-->>B: 401 Unauthorized
    B->>B: clearTokens(), redirect /auth
```

---

## 3. Member Onboarding Flow

```mermaid
flowchart TD
    START([Admin: Add Member]) --> FILL[Fill member form\nname · email · password\nmobile · age · weight · height\ngoal · activity · diet]
    FILL --> PLAN[Select subscription plan]
    PLAN --> PAY{Payment received?}
    PAY -->|Yes| PAY_ON[Toggle ON\npaymentStatus = received]
    PAY -->|No - collect later| PAY_OFF[Toggle OFF\npaymentStatus = pending]
    PAY_ON --> SUBMIT[Submit]
    PAY_OFF --> SUBMIT

    SUBMIT --> CREATE_USER[Create User document\nwith profile]
    CREATE_USER --> CREATE_SUB[Create Subscription\nstartDate = today\nendDate = today + planDays]
    CREATE_SUB --> CREATE_PAY[Create Payment record\npaymentStatus = received/pending]
    CREATE_PAY --> AI_CHECK{Plan has AI\nworkout or diet?}

    AI_CHECK -->|Yes| CREATE_REQ[Auto-create PlanRequest\nstatus = pending]
    AI_CHECK -->|No| DONE_NO_AI[Member account ready]
    CREATE_REQ --> DONE_AI[Member account ready\nRequest appears in Requests queue]

    DONE_NO_AI --> NOTIFY[Member can log in]
    DONE_AI --> NOTIFY
```

---

## 4. AI Plan Generation Flow

```mermaid
flowchart TD
    TRIGGER{How triggered?}
    TRIGGER -->|Admin adds member\nwith AI plan| AUTO[Auto PlanRequest created]
    TRIGGER -->|Member submits\ncheck-in| MANUAL[Member check-in form\nenergy · sleep · soreness]
    MANUAL --> CREATE_REQ[POST /api/plans/check-in\nCreates PlanRequest]

    AUTO --> QUEUE[Appears in Requests queue\nstatus = pending]
    CREATE_REQ --> QUEUE

    QUEUE --> ADMIN_REVIEW[Admin opens request\nReviews member stats]
    ADMIN_REVIEW --> GEN_BTN[Click Generate Plan]

    GEN_BTN --> CALL_AI[POST /api/plans/generate\nBuild AI prompt with:\n- age, weight, height, gender\n- goals, experience, activity\n- diet preferences\n- planTypes: workout/diet]

    CALL_AI --> AI_SERVICE[workoutGenerationService\ndietGenerationService]
    AI_SERVICE --> OPENROUTER[OpenRouter API\nGPT-4o / Claude]

    OPENROUTER --> PARSE[Parse JSON response]
    PARSE --> VALID{Valid plan\nstructure?}
    VALID -->|No| FALLBACK[Try Groq / Gemini fallback]
    FALLBACK --> PARSE
    VALID -->|Yes| SAVE[Save WorkoutPlan + DietPlan\nstatus = active]
    SAVE --> UPDATE_REQ[Update PlanRequest\nstatus = generated]
    UPDATE_REQ --> MEMBER_VIEW[Member sees plan\non home screen]
```

---

## 5. Subscription Lifecycle

```mermaid
stateDiagram-v2
    [*] --> active: Admin assigns plan\n+ payment recorded
    [*] --> trial: Trial plan assigned\n(no payment)

    active --> active: Admin extends\nor sets new end date
    trial --> active: Upgrade to paid plan

    active --> expired: Cron: endDate passed\n(runs daily 1 AM)
    trial --> expired: Cron: endDate passed

    expired --> active: Admin assigns new plan\n(renewal)
    expired --> [*]: 14 days no renewal\n→ gymStatus = left\n(cron: daily 3 AM)

    active --> cancelled: Admin manually cancels
    cancelled --> active: Admin re-activates
```

---

## 6. Payment Workflow

```mermaid
flowchart TD
    PAYMENT_START{Payment scenario}

    PAYMENT_START -->|New member| NEW_MEMBER[Admin creates member\nPayment toggle on form]
    PAYMENT_START -->|Plan renewal| RENEWAL[Admin: Assign Plan tab\nIn Subscription Modal]
    PAYMENT_START -->|Collect pending| COLLECT[Payment pending\nfrom earlier]

    NEW_MEMBER --> AUTO_PAY[Payment record created\nauto with subscription]
    RENEWAL --> RECORD_PAY[Admin records payment\namount · method · status]
    COLLECT --> MARK_BTN{Mark received how?}

    MARK_BTN -->|Payments page| PAYMENTS_PAGE[Payments list\n✓✓ button on pending row]
    MARK_BTN -->|Member profile| SUB_MODAL[Manage Subscription modal\nAmber warning + Mark Received button]

    AUTO_PAY --> STATUS{paymentStatus}
    RECORD_PAY --> STATUS
    PAYMENTS_PAGE --> RECEIVED[paymentStatus = received]
    SUB_MODAL --> RECEIVED

    STATUS -->|received| RECEIVED
    STATUS -->|pending| PENDING[Payment pending\nShows in outstanding]

    PENDING --> VOID{Admin decision}
    VOID -->|Collect later| WAIT[Wait / remind]
    VOID -->|Write off| CANCEL[Cancel payment\nVoid only pending]

    RECEIVED --> LOCKED[Subscription locked\nCannot re-assign plan until expiry]
```

---

## 7. QR Attendance Flow

```mermaid
sequenceDiagram
    participant A as Admin Screen
    participant M as Member Phone
    participant BE as Backend
    participant DB as MongoDB

    Note over A: Attendance page<br/>auto-refreshes QR every 15 min

    A->>BE: GET /api/admin/attendance/qr-token
    BE->>BE: Generate signed token (JWT, 15m expiry)
    BE-->>A: { token, qrUrl }
    A->>A: Render QR code from URL

    Note over M: Member arrives at gym

    M->>M: Open FitFlow app → Scan QR
    M->>BE: POST /api/attendance/mark-in\n{ token }
    BE->>BE: Verify QR token (not expired)
    BE->>DB: Find today's ProgressLog for user

    alt Already checked in (not checked out)
        BE-->>M: { alreadyMarkedIn: true }
        M->>M: Show "Currently In" + Mark Out button
    else Already complete
        BE-->>M: { alreadyComplete: true }
        M->>M: Show session summary
    else First scan today
        BE->>DB: Set attendance.markedInAt = now
        BE-->>M: { ok: true, markedIn: true }
        M->>M: Show "Checked In" success
    end

    Note over M: Member leaves gym

    M->>BE: POST /api/attendance/mark-out
    BE->>DB: Set markedOutAt, calculate durationMinutes
    BE-->>M: { ok: true, durationMinutes: 75 }
    M->>M: Show session complete card

    Note over BE: Cron (every 30 min)
    BE->>DB: Find logs: markedIn but no markOut<br/>AND markedInAt > autoMarkOutHours ago
    DB-->>BE: Stale check-ins
    BE->>DB: Auto set markedOutAt, autoMarkedOut = true
```

---

## 8. Attendance History — Day Status Logic

```mermaid
flowchart TD
    START([For each calendar day\nsince attendance enabled]) --> CHECK_ATT{ProgressLog exists\nwith markedInAt?}

    CHECK_ATT -->|Yes| PRESENT["Status: PRESENT\nShow: check-in time,\ncheck-out time, duration"]

    CHECK_ATT -->|No| CHECK_LEAVE{Day in approved\nLeaveRequest.dates\nAND not in forcedDates?}

    CHECK_LEAVE -->|Yes| LEAVE["Status: LEAVE\nBlue Umbrella icon\nNot counted as absent"]

    CHECK_LEAVE -->|No| CHECK_HOLIDAY{Day in\nGymHoliday collection?}

    CHECK_HOLIDAY -->|Yes| HOLIDAY["Status: HOLIDAY\nPurple Building icon\nShow holiday name\nNot counted as absent"]

    CHECK_HOLIDAY -->|No| ABSENT["Status: ABSENT\nGray X icon\nCounted in absent total"]
```

---

## 9. Leave Request Flow

```mermaid
flowchart TD
    MEMBER[Member: Profile → Leave tab] --> CHECK_PLAN{Plan includes\nleaveRequests feature?}

    CHECK_PLAN -->|No| BLOCKED[403: Feature not in plan]
    CHECK_PLAN -->|Yes| FILL_FORM[Select dates + enter reason]
    FILL_FORM --> VALIDATE{Validation}
    VALIDATE -->|Invalid dates or\nempty reason| ERROR[Show error]
    VALIDATE -->|Valid| SUBMIT[POST /api/leave\nstatus = pending]

    SUBMIT --> ADMIN_QUEUE[Appears in Admin → Leave page]

    ADMIN_QUEUE --> ADMIN_REVIEW[Admin reviews\ndates + reason]
    ADMIN_REVIEW --> DECISION{Decision}

    DECISION -->|Approve| APPROVE[PATCH /api/admin/leave/:id\nstatus = approved]
    DECISION -->|Reject| REJECT[PATCH /api/admin/leave/:id\nstatus = rejected]

    APPROVE --> EFFECT[Dates tagged as LEAVE\nin attendance history\nNot counted as absent]
    REJECT --> EFFECT_REJECT[Dates remain regular\nAbsent if not present]

    APPROVE --> FORCED{Admin sets\nforced dates?}
    FORCED -->|Yes| FORCE[Those specific dates\nare excluded from leave\nAbsent if not present]
    FORCED -->|No| DONE[Leave complete]
```

---

## 10. Cron Jobs Schedule

```mermaid
gantt
    title Daily Cron Execution Timeline
    dateFormat HH:mm
    axisFormat %H:%M

    section Scheduled
    subscription-update (expire subs)   :01:00, 10m
    workout-expiry (mark old plans)     :02:00, 5m
    gym-left-update (14d no renewal)    :03:00, 10m

    section Recurring (every 30 min)
    attendance-auto-markout             :00:00, 5m
    attendance-auto-markout             :00:30, 5m
    attendance-auto-markout             :01:00, 5m
```

```mermaid
flowchart LR
    subgraph DAILY["Daily Cron (1 AM → 3 AM)"]
        C1["1 AM\nsubscription-update\nExpire overdue subscriptions"] --> C2
        C2["2 AM\nworkout-expiry\nMark old plans complete"] --> C3
        C3["3 AM\ngym-left-update\nAuto-mark members left\nafter 14d expiry"]
    end

    subgraph INTERVAL["Every 30 Minutes"]
        C4["attendance-auto-markout\nMark out users who\nforgot to scan out"]
    end
```

---

## 11. Admin Navigation Map

```mermaid
graph LR
    LOGO["FitFlow Admin"] --> NAV

    subgraph NAV["Top Navigation (Primary)"]
        N1["Dashboard"]
        N2["Analytics"]
        N3["Payments"]
        N4["Requests"]
        N5["Users"]
    end

    subgraph DRAWER["Side Drawer (Secondary)"]
        D1["Leave"]
        D2["Subscriptions"]
        D3["Attendance"]
        D4["Customization"]
    end

    subgraph BOTTOM["Bottom Nav (Mobile)"]
        B1["Dashboard"]
        B2["Analytics"]
        B3["Payments"]
        B4["Requests"]
        B5["Users"]
    end
```

---

## 12. Member Navigation Map

```mermaid
graph LR
    HOME["Home\n/home"] --> T1["Today's Workout\n/today-workout"]
    HOME --> T2["Today's Diet\n/today-diet"]
    HOME --> T3["Today's Meals\n/today-meal"]
    HOME --> ATT_CARD["Attendance Card\n→ /my-attendance"]

    subgraph BOTTOM["Bottom Nav"]
        BN1["Home"]
        BN2["Workout"]
        BN3["Diet"]
        BN4["Progress"]
        BN5["Profile"]
    end

    subgraph PROFILE_TABS["Profile Tabs"]
        P1["Info"]
        P2["Progress"]
        P3["Leave"]
        P4["Plans"]
    end

    REPORTS["/reports"] --> RT1["Workout tab\n(6 months)"]
    REPORTS --> RT2["Diet tab\n(6 months)"]
    REPORTS --> RT3["Attendance tab\n(60 days)"]

    SCAN["/scan?token=..."] --> QR_FLOW["Auto mark-in\nOR mark-out if already in"]
```

---

## 13. Data Model Relationships

```mermaid
erDiagram
    User {
        ObjectId _id
        string email
        string passwordHash
        string name
        string role
        string mobile
        object profile
        ObjectId activeSubscriptionId
        string gymStatus
    }

    Subscription {
        ObjectId _id
        ObjectId userId
        ObjectId planId
        string planName
        number price
        object features
        string status
        Date startDate
        Date endDate
        ObjectId paymentId
    }

    SubscriptionPlan {
        ObjectId _id
        string name
        number price
        number durationDays
        object features
        string planType
        string color
        boolean isActive
    }

    Payment {
        ObjectId _id
        ObjectId userId
        ObjectId planId
        ObjectId subscriptionId
        number amount
        string method
        string paymentStatus
        Date paidAt
    }

    WorkoutPlan {
        ObjectId _id
        ObjectId userId
        string status
        array days
        object checkIn
        Date generatedAt
    }

    DietPlan {
        ObjectId _id
        ObjectId userId
        string status
        array days
        object checkIn
        Date generatedAt
    }

    PlanRequest {
        ObjectId _id
        ObjectId userId
        object checkIn
        array planTypes
        string status
        Date requestedAt
    }

    ProgressLog {
        ObjectId _id
        ObjectId userId
        Date date
        object measurements
        object attendance
    }

    LeaveRequest {
        ObjectId _id
        ObjectId userId
        array dates
        array forcedDates
        string status
        string reason
    }

    GymSettings {
        ObjectId _id
        boolean attendanceEnabled
        Date attendanceEnabledAt
        number autoMarkOutHours
        number qrTokenExpiryMinutes
    }

    GymHoliday {
        ObjectId _id
        string date
        string name
        string reason
    }

    User ||--o{ Subscription : "has"
    User ||--o{ Payment : "makes"
    User ||--o{ WorkoutPlan : "owns"
    User ||--o{ DietPlan : "owns"
    User ||--o{ PlanRequest : "requests"
    User ||--o{ ProgressLog : "logs"
    User ||--o{ LeaveRequest : "submits"
    SubscriptionPlan ||--o{ Subscription : "template for"
    Subscription ||--o| Payment : "linked to"
```
