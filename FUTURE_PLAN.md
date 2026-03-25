# FitFlow — Future Roadmap

> Planned features, integrations, and improvements for FitFlow. Organized by phase and priority.

---

## Table of Contents

1. [Phase 1 — WhatsApp Integration](#phase-1--whatsapp-integration)
2. [Phase 2 — AI Chatbot Assistant](#phase-2--ai-chatbot-assistant)
3. [Phase 3 — Payment Gateway Integration](#phase-3--payment-gateway-integration)
4. [Phase 4 — Multi-Gym / Franchise Support](#phase-4--multi-gym--franchise-support)
5. [Phase 5 — Mobile App](#phase-5--mobile-app)
6. [Phase 6 — Advanced AI & Personalization](#phase-6--advanced-ai--personalization)
7. [Phase 7 — Community & Gamification](#phase-7--community--gamification)
8. [Technical Debt & Infrastructure](#technical-debt--infrastructure)
9. [Feature Priority Matrix](#feature-priority-matrix)

---

## Phase 1 — WhatsApp Integration

**Priority: HIGH | Estimated effort: 3–4 weeks**

WhatsApp has near-100% penetration in the target market. Replacing email with WhatsApp notifications eliminates the deliverability problem entirely.

### 1.1 Member Notifications

| Trigger | Message |
|---------|---------|
| Account created | Welcome message + login credentials |
| Subscription expiring in 3 days | "Your membership expires on {date}. Renew now →" |
| Subscription expired | "Your membership has expired. Contact admin to renew." |
| Plan generated | "Your AI workout + diet plan is ready! Open FitFlow →" |
| Leave approved | "Your leave request for {dates} has been approved." |
| Leave rejected | "Your leave request was not approved. Reason: {reason}" |
| Payment pending reminder (weekly) | "You have an outstanding payment of ₹{amount}." |
| Holiday announcement | "Gym closed on {date}: {holiday name}" |

### 1.2 OTP-Based Password Reset

Replace admin-only password reset with self-service OTP flow:

```
Member → "Forgot Password"
       ↓
Enter registered mobile number
       ↓
WhatsApp OTP sent (6-digit, 5 min expiry)
       ↓
Member enters OTP → set new password
       ↓
Session created → redirect to home
```

### 1.3 Payment Receipt via WhatsApp

After admin marks payment as received:
```
Auto-send receipt to member's WhatsApp:
  "Payment of ₹{amount} received for {plan} plan.
   Valid until {endDate}. Thank you!"
```

### 1.4 Implementation Plan

**Backend changes:**
- Add `mobile` field to User (already added)
- Create `NotificationService` with WhatsApp provider abstraction
- Add notification triggers to: subscription cron, payment routes, leave routes, plan generation
- Store notification log in DB (for retry + audit)

**Recommended provider:** [Twilio WhatsApp API](https://www.twilio.com/whatsapp) or [Gupshup](https://www.gupshup.io/) (cheaper for India market)

**New env vars needed:**
```
WHATSAPP_PROVIDER=twilio | gupshup
WHATSAPP_API_KEY=
WHATSAPP_FROM_NUMBER=+91XXXXXXXXXX
```

**Database — new model: `Notification`**
```typescript
{
  userId: ObjectId,
  channel: 'whatsapp',
  type: 'plan_ready' | 'subscription_expiry' | 'payment_receipt' | 'otp' | ...,
  to: string,           // phone number
  message: string,
  status: 'sent' | 'failed' | 'pending',
  sentAt?: Date,
  error?: string,
}
```

---

## Phase 2 — AI Chatbot Assistant

**Priority: HIGH | Estimated effort: 4–5 weeks**

An in-app AI assistant that members can query about their workout, diet, progress, and gym operations.

### 2.1 Member Chatbot

**Capabilities:**

| Query type | Example | Response |
|------------|---------|---------|
| Workout explanation | "Why am I doing Romanian deadlifts?" | Exercise purpose, muscles targeted, form tips |
| Diet clarification | "What can I substitute for chicken?" | AI-suggested swap matching macros |
| Progress analysis | "Am I improving?" | Trend analysis from progress logs |
| Plan guidance | "I'm sore today, should I train?" | Adaptive recommendation based on check-in data |
| General fitness | "How much water should I drink?" | Evidence-based answer |
| Gym FAQ | "What time does the gym open?" | From gym settings / announcements |

### 2.2 Admin Chatbot

**Capabilities:**

| Query | Response |
|-------|---------|
| "Who hasn't renewed in 30 days?" | List of expired members |
| "How much revenue did I make this month?" | Live analytics pull |
| "Which members have pending payments?" | List with amounts |
| "Who has been absent more than 5 days?" | Attendance summary query |
| "Generate a report for {member name}" | Member summary card |

### 2.3 Implementation Plan

**Architecture:**

```
User types message in chat widget
       ↓
POST /api/chat/message
       ↓
Context builder:
  - User profile + current plan
  - Last 7 progress logs
  - Active subscription info
  - Recent announcements (for gym FAQ)
       ↓
OpenRouter (GPT-4o / Claude) with system prompt
       ↓
Streaming response → chat UI
       ↓
Message stored in chat history (last 20 messages per session)
```

**New route:** `POST /api/chat/message`
**New model:** `ChatMessage { userId, role, content, createdAt }`
**Frontend:** Floating chat bubble on all user pages, full-page chat on `/chat`

---

## Phase 3 — Payment Gateway Integration

**Priority: MEDIUM | Estimated effort: 2–3 weeks**

Allow members to pay online via UPI / card without admin involvement.

### 3.1 Self-Service Renewal

```
Member sees "Subscription Expiring" banner
       ↓
Clicks "Renew Now"
       ↓
Selects plan → payment page
       ↓
Razorpay / PayU checkout (UPI, card, netbanking)
       ↓
Webhook confirms payment
       ↓
Subscription auto-renewed → member notified via WhatsApp
       ↓
Admin sees payment in Payments dashboard (status: received)
```

### 3.2 Admin-Initiated Payment Link

- Admin records a pending payment → generates a payment link
- Link sent to member via WhatsApp
- Member pays → webhook updates status to received

### 3.3 Implementation Plan

**Recommended provider:** Razorpay (best UPI support in India, low fees)

**New env vars:**
```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

**New routes:**
- `POST /api/payments/create-order` — creates Razorpay order
- `POST /api/payments/webhook` — handles payment confirmation
- `GET /api/payments/verify` — client-side verification

**Security note:** Webhook must verify Razorpay signature. Never trust frontend-reported payment status.

---

## Phase 4 — Multi-Gym / Franchise Support

**Priority: MEDIUM | Estimated effort: 6–8 weeks**

Enable a single FitFlow instance to manage multiple gym locations under one admin account.

### 4.1 Data Model Changes

Add `gymId` to all tenant-scoped collections:
- `User`, `Subscription`, `Payment`, `ProgressLog`, `Attendance`, `LeaveRequest`, `PlanRequest`

### 4.2 Roles Expansion

| Role | Access |
|------|--------|
| `superadmin` | All gyms, billing, global settings |
| `admin` | Single gym — current admin role |
| `trainer` | Assigned members only, no financial data |
| `user` | Own data only |

### 4.3 New Features

- Gym selector in admin nav for superadmin
- Per-gym analytics + combined dashboard
- Trainer assignment with notes access
- Cross-gym member transfer

---

## Phase 5 — Mobile App

**Priority: MEDIUM | Estimated effort: 8–12 weeks**

Native iOS/Android apps for members (admins stay on web).

### 5.1 Tech Stack

**Recommended:** React Native with Expo (reuses existing TypeScript + API knowledge)

### 5.2 Member App Features

- All current user-facing features (workout, diet, progress, attendance)
- **Push notifications** (replacing WhatsApp for app users)
- **Native QR scanner** (better camera integration than browser)
- **Offline workout viewing** (cache current plan locally)
- **Home screen widget** — today's workout summary

### 5.3 Backend Changes Required

- `POST /api/auth/device-token` — store FCM/APNs device token
- Push notification service alongside WhatsApp service
- Offline-friendly API responses (ETag / Last-Modified caching)

---

## Phase 6 — Advanced AI & Personalization

**Priority: LOW-MEDIUM | Estimated effort: ongoing**

### 6.1 Adaptive Plans

Currently, AI generates a plan once and it stays until regenerated. Future: plans adapt based on logged progress.

```
Weekly cron:
  - Fetch last 7 progress logs per member
  - If completion rate < 60% → reduce intensity
  - If completion rate > 90% + no soreness → increase intensity
  - Auto-generate updated plan
  - Notify member: "Your plan has been updated based on your progress!"
```

### 6.2 Injury & Recovery Detection

- Member logs high soreness (4-5/5) on specific muscle groups
- AI automatically adjusts next workout to avoid those muscles
- Recovery day suggestion based on sleep quality logs

### 6.3 Nutrition Intelligence

- Track actual food eaten vs planned macros (member input)
- Weekly nutrition report with AI commentary
- Smart meal swaps based on preferences and local food options (India-specific)

### 6.4 Body Composition Tracking

- Member logs body measurements (chest, waist, arms, etc.)
- Progress charts with trend lines
- AI milestone detection: "You've lost 3cm from your waist in 30 days!"

---

## Phase 7 — Community & Gamification

**Priority: LOW | Estimated effort: 4–6 weeks**

### 7.1 Leaderboard

- Monthly attendance leaderboard
- Consistency streaks (days in a row without missing)
- Progress milestones (weight goals achieved)

### 7.2 Badges & Achievements

| Badge | Trigger |
|-------|---------|
| First Check-In | First QR scan |
| 7-Day Streak | 7 consecutive attendance days |
| 30-Day Warrior | 30 days in a month |
| Goal Crusher | Reaches stated fitness goal |
| Consistent | 80%+ attendance for 3 months |

### 7.3 Announcements Feed

- Turn announcements into a proper social feed
- Gym owner can post progress photos, tips, motivational content
- Members can react (no comments — keeps it simple)

---

## Technical Debt & Infrastructure

### Immediate improvements

| Item | Priority | Description |
|------|----------|-------------|
| Structured logging | High | Replace `console.log` with `pino` or `winston` |
| Error tracking | High | Integrate Sentry for both frontend and backend |
| API tests | High | Integration tests for critical payment + subscription flows |
| TypeScript strict mode | Medium | Enable `strict: true`, fix `any` types |
| Database indexes audit | Medium | Run `explain()` on slow queries |
| Redis caching | Low | Cache AI plan generation, subscription lookups |

### Monitoring checklist

- [ ] Vercel analytics for frontend performance
- [ ] MongoDB Atlas performance advisor
- [ ] Cron job execution alerts (notify on failure)
- [ ] API response time monitoring
- [ ] Error rate alerting

---

## Feature Priority Matrix

```
                HIGH IMPACT
                     │
    WhatsApp ────────┼──── Chatbot
    OTP Reset        │
                     │     Online Payments
    ─────────────────┼─────────────────────
    LOW EFFORT       │         HIGH EFFORT
                     │
    Structured       │    Multi-Gym Support
    Logging          │
    Sentry           │    Mobile App
                     │
                LOW IMPACT
```

### Recommended Build Order

| Phase | Feature | Why now |
|-------|---------|---------|
| 1 | WhatsApp notifications + OTP reset | Highest daily-use value, removes admin dependency for password resets |
| 2 | Payment gateway (Razorpay) | Removes manual payment collection friction |
| 3 | AI Chatbot (member) | Differentiator, reduces admin support queries |
| 4 | Structured logging + Sentry | Foundation for reliable operations at scale |
| 5 | Adaptive AI plans | Retention driver — members see their plan evolve |
| 6 | Multi-gym / trainer roles | Unlocks B2B / franchise sales |
| 7 | Mobile app | After web is fully stable |
| 8 | Gamification | Nice-to-have once active user base exists |

---

*Document version: 1.0 — March 2026*
*Next review: June 2026*
