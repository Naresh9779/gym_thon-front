# FitFlow — Standard Operating Procedures (SOP)

> This document covers day-to-day operations for gym owners and admins using the FitFlow platform.

---

## Table of Contents

1. [First-Time Setup](#1-first-time-setup)
2. [Onboarding a New Member](#2-onboarding-a-new-member)
3. [Managing Subscriptions](#3-managing-subscriptions)
4. [Recording Payments](#4-recording-payments)
5. [Generating AI Plans](#5-generating-ai-plans)
6. [Attendance Management](#6-attendance-management)
7. [Leave Request Workflow](#7-leave-request-workflow)
8. [Holidays and Announcements](#8-holidays-and-announcements)
9. [Member Exits](#9-member-exits)
10. [Analytics and Reporting](#10-analytics-and-reporting)
11. [Admin Account Management](#11-admin-account-management)
12. [Subscription Plans Setup](#12-subscription-plans-setup)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. First-Time Setup

### After deployment, complete these steps before accepting members:

```
Step 1 → Change admin password
         Dashboard → top-right avatar → Account Settings

Step 2 → Create subscription plans
         Subscriptions → + New Plan
         (see Section 12 for plan design guidance)

Step 3 → Configure gym settings
         Customization → Attendance
         - Enable attendance system
         - Set auto mark-out hours (recommended: 3)
         - Set QR token expiry (recommended: 15 min)

Step 4 → Add gym holidays
         Customization → Holidays
         Add national holidays, gym closure days

Step 5 → Post welcome announcement
         Customization → Announcements → + New
```

---

## 2. Onboarding a New Member

**Path:** Admin → Users → Add Member

### Required Information

| Field | Notes |
|-------|-------|
| Full Name | Legal name |
| Email | Used for login — must be unique |
| Password | Temporary — member should change on first login |
| Mobile | Optional — for WhatsApp notifications (future) |
| Age / Weight / Height | Used for AI plan generation |
| Gender | Required for AI plan accuracy |
| Goal | Muscle Gain / Weight Loss / Strength / Endurance / General Fitness |
| Activity Level | Sedentary / Light / Moderate / Active / Very Active |
| Experience Level | Beginner / Intermediate / Advanced |
| Diet Type | Balanced / High Protein / Low Carb / Mediterranean |
| Subscription Plan | Select the paid tier for this member |
| Payment Received | Toggle ON if cash/UPI collected, OFF if pending |

### What happens automatically on member creation

```
Member account created
       ↓
Subscription activated (start date = today)
       ↓
Payment record created (received or pending)
       ↓
If plan includes AI Workout OR AI Diet:
  → Plan Request auto-created in Requests queue
       ↓
Member can log in immediately
```

### After creating the member

1. Go to **Requests** — a plan request will be waiting
2. Review member profile, click **Generate Plan**
3. AI generates workout + diet plan (takes ~15-30 seconds)
4. Member will see the plan on their home screen

---

## 3. Managing Subscriptions

**Path:** Users → Member → Manage Subscription button

### Subscription States

| Status | Meaning |
|--------|---------|
| `active` | Subscription running, all features available |
| `trial` | Trial period, features based on plan |
| `expired` | Past end date, member restricted to profile/reports/attendance |
| `cancelled` | Manually cancelled |

### Extend / Modify Subscription

- **Extend:** Add months to current end date (use negative to reduce)
- **Set Date:** Pick a specific new end date (for custom arrangements)
- **Assign Plan:** Assign a new plan — only available after current plan expires

### Payment Status in Manage Subscription

- If the active subscription has a **pending** payment, you'll see an amber warning with a **Mark Received** button
- Click **Mark Received** once cash/UPI is collected

### Rules

- You cannot assign a new plan while an active subscription is running
- Subscription changes are locked if payment has been received (prevents accidental billing issues)
- Use **Extend** or **Set Date** to adjust dates without creating a new payment record

---

## 4. Recording Payments

**Path:** Admin → Payments OR Users → Member → Manage Subscription → Assign Plan

### When adding a new member
Payment is recorded automatically. Toggle "Payment Received" ON (default) or OFF if collecting later.

### When renewing/assigning a plan
1. Open member profile → Manage Subscription
2. Switch to **Assign Plan** tab
3. Select plan, set payment status, amount, and method
4. Click Save — subscription activates immediately

### Mark a pending payment as received
- **From Payments page:** Find the payment → click ✓✓ (checkmark) icon
- **From member's Subscription modal:** Click the amber "Mark Received" button

### Void a payment
- Payments page → find the pending payment → click ✗ → confirm void
- Only **pending** payments can be voided (received payments are locked)

### Payment Methods
`Cash` · `UPI` · `Card` · `Other`

---

## 5. Generating AI Plans

**Path:** Admin → Requests

### How plan requests are created
- **Automatically:** When a member is added with an AI-capable plan
- **Manually:** Member triggers check-in from home screen; admin approves

### Generation workflow

```
Requests list → click member request
       ↓
Review member stats (weight, goals, experience)
       ↓
Click "Generate Workout Plan" and/or "Generate Diet Plan"
       ↓
AI generates plan (~15-30 seconds per plan)
       ↓
Plan appears on member's home screen immediately
       ↓
Request marked as "Generated"
```

### Re-generating plans
- Member submits a new check-in from their home screen
- A new plan request appears in the Requests queue
- Generate the new plan — old plan is replaced

### Override / Manual Edit
- Go to Users → Member → Workout Plans / Diet Plans
- Click any plan to edit individual days, meals, or exercises

---

## 6. Attendance Management

**Path:** Admin → Attendance

### Setup (one-time)
1. Customization → Attendance → Enable attendance system
2. Set auto mark-out hours (default: 3h)
3. Set QR token expiry (default: 15 min)

### Daily Operations

```
Member arrives at gym
       ↓
Admin shows QR code on Attendance page (or prints/displays it)
       ↓
Member opens their app → Home → "Scan QR" or /scan
       ↓
Member scans QR → automatically marked IN
       ↓
Member leaves → scans QR again → automatically marked OUT
  (or admin can see "Currently In" and mark out manually)
       ↓
If member forgets: auto mark-out runs every 30 min via cron
```

### QR Code Notes
- QR token expires every 15 minutes (configurable)
- Admin page auto-refreshes the QR — no manual refresh needed
- Members can also mark out from their home screen or `/my-attendance` page

### Viewing Attendance
- **Today's View:** Attendance page shows live present/absent count, who's currently inside
- **Member History:** Users → Member → Reports → Attendance tab (60-day view)
- **Member's Own View:** `/my-attendance` — 30-day history with leave/holiday integration

### Absence Policy
- Days on approved leave are tagged "Leave" (blue) — not counted as absent
- Gym holidays are tagged "Holiday" (purple) — not counted as absent
- Absent count starts from the day attendance was enabled (not from subscription start)

---

## 7. Leave Request Workflow

**Path:** Admin → Leave

### Member submits leave
1. Member opens app → Profile → Leave tab
2. Selects dates and enters reason
3. Submits request (requires `leaveRequests` feature in plan)

### Admin review

```
New leave request appears in Leave page
       ↓
Admin reviews: dates + reason
       ↓
Approve → dates marked as "Leave" in attendance (not absent)
  OR
Reject → member notified, dates stay as regular days
```

### Force Come-In
- After approving, admin can toggle specific dates as "Forced" — member still expected on those days
- Forced dates will count as absent if member doesn't show up

### Leave Constraints (configured automatically)
- Leave cannot be requested for past dates
- Maximum leave days per request can be set in subscription plan

---

## 8. Holidays and Announcements

**Path:** Admin → Customization

### Adding a Holiday

1. Customization → Holidays → + Add Holiday
2. Enter date and name (e.g., "Republic Day")
3. Save — all members will see this date as a holiday in attendance history

**Effect on attendance:** Holiday dates are tagged "Holiday" (purple) instead of absent.

### Creating an Announcement

1. Customization → Announcements → + New
2. Fill in:
   - **Title:** Short heading (e.g., "Gym Closed Sunday")
   - **Body:** Full message
   - **Type:** `info` / `warning` / `success` / `alert`
   - **Expiry Date:** When to stop showing (optional)
3. Save — announcement appears on member home screens immediately

### Announcement Types

| Type | Use case |
|------|---------|
| `info` | General updates (new equipment, schedule changes) |
| `warning` | Temporary closure, maintenance |
| `success` | Achievements, member milestones |
| `alert` | Urgent notices |

---

## 9. Member Exits

**Path:** Users → Member → Mark as Left Gym

### Standard exit flow

1. Open member profile
2. Scroll to "Gym Status" section → Mark as Left
3. Select reason: `Moved Away` / `Health Issues` / `Cost` / `Other`
4. Confirm

**Warnings shown before confirming:**
- If active subscription still running → subscription is not cancelled, just status is updated
- If payment is pending → red warning to collect payment first

### Automatic exit (via cron)
Members are auto-marked as "Left Gym" 14 days after their subscription expires with no renewal.

### Re-admitting a member
- Member's account is preserved — just assign a new plan
- All history (past plans, progress, attendance) is retained
- Go to member profile → Manage Subscription → Assign Plan

---

## 10. Analytics and Reporting

**Path:** Admin → Analytics

### Available Metrics

| Metric | Description |
|--------|-------------|
| Total Members | All-time registered members |
| Active Members | Currently active or trial subscriptions |
| Revenue (MTD) | Month-to-date collected payments |
| Pending Revenue | Unpaid pending payments |
| Member Growth | New members per month (chart) |
| Revenue Trend | 12-month revenue bar chart |
| Plan Distribution | Members per subscription plan (pie) |
| Active Plans | Workout + diet plans in use |

### Member-level Reports
- Users → Member → Reports tab
- Three sub-tabs: Workout history / Diet history / Attendance history
- Workout/Diet: monthly breakdown with completion rates
- Attendance: present/absent/leave/holiday for last 60 days

### Payment Reports
- Payments page → filter by status/method/search
- Revenue by Plan chart (received vs pending stacked)
- All-time revenue, MTD, pending outstanding

---

## 11. Admin Account Management

### Change admin password
- Currently: Admin → User Detail page → Reset Password section
- Enter new password (min 8 characters)

### Add another admin
- Currently not supported in UI (single-admin design)
- Can be done directly in MongoDB by setting `role: "admin"` on a user document

### Session management
- Sessions auto-expire after 7 days (refresh token lifetime)
- Logging out immediately invalidates the token

---

## 12. Subscription Plans Setup

**Path:** Admin → Subscriptions

### Plan design recommendations

| Tier | Features | Suggested Duration |
|------|---------|-------------------|
| Basic | Progress tracking + leave | 1 month |
| Standard | + AI Workout | 1–3 months |
| Premium | AI Workout + AI Diet | 3–6 months |
| Trial | All features, no charge | 7–14 days |

### Creating a plan

1. Click **+ New Plan**
2. Enter name, price, duration (in days)
3. Toggle features: AI Workout, AI Diet, Leave Requests, Progress Tracking
4. Pick color (used in UI labels and charts)
5. Set as **Active** to make it available for assignment

### Editing a plan
- Changes apply only to **new subscriptions** — existing members are not affected
- Feature changes to an existing member require assigning a new plan

### Deactivating a plan
- Toggle plan to **Inactive** — it disappears from the Add Member / Assign Plan selectors
- Existing subscriptions using this plan continue unaffected

---

## 13. Troubleshooting

### Member can't log in
1. Check their email is correct (Users → search)
2. Reset password: Users → Member → Reset Password section
3. If subscription expired, they can only access `/profile`, `/reports`, `/scan`, `/my-attendance`

### AI plan not generating
1. Check OpenRouter API key is set correctly in env vars
2. Check Requests page — the request must be in `pending` status
3. If the request shows an error, re-generate — AI occasionally times out

### QR code not working for member
1. Check QR token hasn't expired (default: 15 min) — refresh the Attendance page
2. Check attendance is enabled in Customization
3. Check the member's subscription is active (expired members can still scan out but not in)

### Attendance showing wrong absent count
1. Absent count starts from the day attendance was enabled — check Customization → Attendance for the enabled date
2. Leave-approved days are excluded from absent count
3. Holidays are excluded from absent count

### Payment marked as received by mistake
- Received payments cannot be changed (locked for audit integrity)
- Add a note to the member's profile explaining the situation
- Contact support if a reversal is critical

### Subscription won't assign (locked error)
- A new plan cannot be assigned while an active subscription is running
- Use **Extend** or **Set Date** to modify the current subscription
- Wait for expiry, or manually set end date to today using Set Date tab

### Cron jobs not running
1. Check Vercel dashboard → Project → Functions → Cron Jobs
2. Ensure `CRON_SECRET` env var is set on the backend Vercel project
3. Check cron logs for error messages

---

*Last updated: March 2026*
