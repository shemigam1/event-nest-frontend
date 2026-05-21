# EventNest — End-to-End Test Checklist

**Two test accounts**
- **Account A (Organiser / Attendee):** `jsbazman1@gmail.com`
- **Account B (Vendor / Attendee):** `jsbazman2@gmail.com`
- **Admin account:** existing

Run both servers before starting:
```
Frontend  →  http://localhost:5173
Backend   →  http://localhost:8080
```

---

## Phase 1 — Public Pages (no login required)

| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 1.1 | Open the app | `/` | Landing page loads, no console errors |
| [ ] | 1.2 | Click "Browse events" | `/events` | Event grid renders with cover images and dates |
| [ ] | 1.3 | Confirm no price shows "∞" | `/events` | All cards show a price, "Free", or "—" |
| [ ] | 1.4 | Confirm venue names show | `/events` | Each card shows a venue name |
| [ ] | 1.5 | Open any event detail | `/events/:id` | Title, date, venue, tiers all visible |
| [ ] | 1.6 | Open Vendor Marketplace | `/vendors` | Vendor cards load |
| [ ] | 1.7 | Open a vendor profile | `/vendors/:id` | Vendor detail page renders |
| [ ] | 1.8 | Navigate to `/dashboard` without logging in | redirect | Redirects to `/login` |

---

## Phase 2 — Authentication

### Register & Login
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 2.1 | Register Account A (`jsbazman1@gmail.com`) | `/register` | Account created, redirected into app |
| [ ] | 2.2 | Log out Account A | Sidebar → Sign out | Returns to landing/login |
| [ ] | 2.3 | Register Account B (`jsbazman2@gmail.com`) | `/register` | Account created, redirected into app |
| [ ] | 2.4 | Log out Account B | Sidebar → Sign out | Returns to landing/login |
| [ ] | 2.5 | Login Account A | `/login` | JWT stored, sidebar shows Attendee nav |
| [ ] | 2.6 | Login with wrong password | `/login` | Error message shown, no crash |
| [ ] | 2.7 | Forgot password flow | `/forgot-password` | "Email sent" confirmation shown |

---

## Phase 3 — Attendee Flow (Account A)

> Logged in as `jsbazman1@gmail.com` · Workspace: **Attendee**

### Tickets & Booking
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 3.1 | Open My Tickets (empty) | `/tickets` | Empty state renders, no crash |
| [ ] | 3.2 | Open Dashboard (empty) | `/dashboard` | Empty state renders, no crash |
| [ ] | 3.3 | Open any published event | `/events/:id` | "Book ticket" button visible |
| [ ] | 3.4 | Start booking flow | `/events/:id/book` | Tier selection and form load |
| [ ] | 3.5 | Complete a booking | `/events/:id/book` | Booking confirmed, redirected to `/payment-result` |
| [ ] | 3.6 | View ticket in My Tickets | `/tickets` | Ticket card appears with event name and seat |
| [ ] | 3.7 | Open QR modal | `/tickets` → "Show QR" | QR code renders, short code visible |
| [ ] | 3.8 | View booking in Dashboard | `/dashboard` | Booking row visible with status |

### Ticket Transfer
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 3.9 | Switch to "Transfer a Ticket" tab | `/tickets` | Transfer tab renders |
| [ ] | 3.10 | Select a ticket to transfer | Transfer tab | Ticket option highlights on click |
| [ ] | 3.11 | Enter a non-existent email | Transfer tab | Backend returns error, shown inline |
| [ ] | 3.12 | Transfer ticket to `jsbazman2@gmail.com` | Transfer tab | "Ticket transferred successfully" shown |
| [ ] | 3.13 | Confirm ticket gone from Account A | `/tickets` | Transferred ticket no longer listed |
| [ ] | 3.14 | Log in as Account B, check tickets | `/tickets` | Transferred ticket now visible on Account B |

### Settings
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 3.15 | Open Settings | `/settings` | Page renders without error |
| [ ] | 3.16 | Update profile name | `/settings` | Save succeeds, name updates |

---

## Phase 4 — Organiser Flow (Account A)

> Switch workspace to **Organiser** via TopBar avatar dropdown

### My Events
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 4.1 | Switch to Organiser workspace | TopBar dropdown | Sidebar shows organiser nav items |
| [ ] | 4.2 | Open My Events (empty) | `/organiser` | Empty state renders |
| [ ] | 4.3 | Create a new event | `/events/new` | Form submits, draft event appears in My Events |
| [ ] | 4.4 | Edit the event | `/events/:id/edit` | Changes saved, updated title/dates visible |
| [ ] | 4.5 | Submit event for approval | Event → Settings tab → "Submit for approval" | Status changes to PENDING |

### Event Workspace Tabs
> Open the event workspace `/organiser/events/:id`

| Done | # | Action | Tab | Pass Condition |
|------|---|--------|-----|----------------|
| [ ] | 4.6 | Open event workspace | — | Header loads with event title and status |
| [ ] | 4.7 | Programme — add a programme item | Programme | Item saved and listed |
| [ ] | 4.8 | Programme — edit the item | Programme | Changes saved |
| [ ] | 4.9 | Programme — delete the item | Programme | Item removed |
| [ ] | 4.10 | Guests — add a guest by email | Guests | Guest appears in list |
| [ ] | 4.11 | Guests — remove the guest | Guests | Guest removed |
| [ ] | 4.12 | Budget — add a budget line item | Budget | Item saved with amount |
| [ ] | 4.13 | Budget — mark line item as paid | Budget | Status updates to paid |
| [ ] | 4.14 | Team — invite a manager by email | Team | Invite created and listed |
| [ ] | 4.15 | Vendors — view applications | Vendors | List renders (may be empty) |
| [ ] | 4.16 | Contracts — view contracts | Contracts | List loads without crash |
| [ ] | 4.17 | Comments — view/toggle | Comments | Tab renders |
| [ ] | 4.18 | Attendees — view bookings | Attendees | List renders (or empty state) |

### Settings Tab (Event Config)
| Done | # | Action | Tab | Pass Condition |
|------|---|--------|-----|----------------|
| [ ] | 4.19 | Load Settings tab | Settings | All toggles load with correct values (no 500 error) |
| [ ] | 4.20 | Toggle Ticket Transfers on | Settings | Toggle flips, PATCH succeeds |
| [ ] | 4.21 | Toggle Waitlist on | Settings | Toggle flips, PATCH succeeds |
| [ ] | 4.22 | Toggle Vendor Applications open | Settings | Toggle flips, PATCH succeeds |
| [ ] | 4.23 | Set free ticket limit to 5 (stepper) | Settings | +/− works, Save button appears, PATCH succeeds |
| [ ] | 4.24 | Set limit to Unlimited | Settings | Shows "∞", `clearFreeTicketLimit: true` sent |
| [ ] | 4.25 | Click vendor category chips (e.g. Catering, AV) | Settings | Chips highlight, PATCH succeeds |
| [ ] | 4.26 | Deselect a category chip | Settings | Chip deselects, PATCH succeeds |

### Organiser-Level Pages
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 4.27 | Organiser Contracts | `/organiser/contracts` | Page loads (no redirect to home) |
| [ ] | 4.28 | Search/filter contracts | `/organiser/contracts` | Filter tabs respond |
| [ ] | 4.29 | Organiser Account | `/organiser/account` | Loads without crash |
| [ ] | 4.30 | Organiser Disputes | `/organiser/disputes` | Empty state shows green checkmark |

---

## Phase 5 — Admin Approves Event

> Log in as **admin account**

| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 5.1 | Open Event Moderation | `/admin/moderation` | Pending events listed, jsbazman1's event visible |
| [ ] | 5.2 | Approve jsbazman1's event | `/admin/moderation` | Status → PUBLISHED |
| [ ] | 5.3 | Confirm event now public | `/events` (anonymous) | Event appears in discovery grid |
| [ ] | 5.4 | Reject another event | `/admin/moderation` | Status → REJECTED, reason captured |
| [ ] | 5.5 | Event Edits queue | `/admin/event-edits` | List loads |
| [ ] | 5.6 | Manage Users | `/admin/users` | User list loads |
| [ ] | 5.7 | Disable a user | `/admin/users` | User disabled |
| [ ] | 5.8 | Re-enable the same user | `/admin/users` | User active again |
| [ ] | 5.9 | View user's events | `/admin/users/:id/events` | Events listed |
| [ ] | 5.10 | Admin Vendors | `/admin/vendors` | Vendor list loads |
| [ ] | 5.11 | Open vendor detail | `/admin/vendors/:id` | Detail page renders |
| [ ] | 5.12 | Approve vendor verification | `/admin/vendors/:id` | Status → VERIFIED |
| [ ] | 5.13 | Invite a new admin | `/admin/invite` | Invite sent successfully |
| [ ] | 5.14 | Escrow page | `/admin/escrow` | Renders without crash (stub) |

---

## Phase 6 — Vendor Flow (Account B)

> Log in as `jsbazman2@gmail.com` · Switch to **Vendor** workspace

### Vendor Onboarding
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 6.1 | Switch to Vendor workspace | TopBar dropdown | Sidebar shows vendor nav |
| [ ] | 6.2 | Complete vendor profile | `/vendor/profile` | Profile saved, verification submitted |
| [ ] | 6.3 | *(Admin approves — see 5.12)* | — | Vendor status → VERIFIED |

### Vendor Discovery & Application
| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 6.4 | Browse opportunities | `/vendor/opportunities` | Events with open vendor applications shown |
| [ ] | 6.5 | Apply to jsbazman1's event | `/vendor/apply/:eventId` | Application submitted |
| [ ] | 6.6 | View application in My Applications | `/vendor/applications` | Application listed with status |
| [ ] | 6.7 | Vendor Dashboard | `/vendor` | Stats and applications visible |
| [ ] | 6.8 | Vendor Contracts (empty) | `/vendor/contracts` | Loads without crash |
| [ ] | 6.9 | Vendor Disputes (empty) | `/vendor/disputes` | Empty state, no crash |

---

## Phase 7 — Organiser ↔ Vendor Contract Flow

> Switch between Account A (organiser) and Account B (vendor)

| Done | # | Action | Who | Pass Condition |
|------|---|--------|-----|----------------|
| [ ] | 7.1 | Accept jsbazman2's application | Account A → Vendors tab | Status → ACCEPTED |
| [ ] | 7.2 | Create contract for vendor | Account A → Contracts tab | Contract created, status DRAFT |
| [ ] | 7.3 | Add milestone(s) to contract | Account A → Contracts tab | Milestones saved and listed |
| [ ] | 7.4 | Sign contract as organiser | Account A | POST `/contracts/:id/sign` succeeds, status → SIGNED |
| [ ] | 7.5 | View contract as vendor | Account B → `/vendor/contracts` | Contract visible with SIGNED status |
| [ ] | 7.6 | Counter-sign as vendor | Account B → `/vendor/contracts` | Status → ACTIVE |
| [ ] | 7.7 | Fund escrow (simulated) | Account A → `/organiser/account` | Payment modal completes, status → ACTIVE/FUNDED |
| [ ] | 7.8 | Approve a milestone | Account A → Contracts tab | Milestone status → APPROVED |
| [ ] | 7.9 | Release a milestone | Account A → Contracts tab | Milestone status → RELEASED, balance updates |
| [ ] | 7.10 | Raise a dispute on a milestone | Account A → Contracts/Account | Milestone status → DISPUTED |
| [ ] | 7.11 | Dispute visible for organiser | Account A → `/organiser/disputes` | Dispute card with frozen amount shown |
| [ ] | 7.12 | Dispute visible for vendor | Account B → `/vendor/disputes` | Dispute card with reason shown |

---

## Phase 8 — Messages

| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 8.1 | Open Messages as Account A | `/messages` | Conversation list loads |
| [ ] | 8.2 | Start a conversation / send a message to Account B | `/messages` | Message sent, appears in thread |
| [ ] | 8.3 | Log in as Account B, open Messages | `/messages` | Message from Account A visible |
| [ ] | 8.4 | Reply as Account B | `/messages` | Reply appears in thread |
| [ ] | 8.5 | Mark conversation as read | `/messages` | Unread count updates |

---

## Phase 9 — Check-In

| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 9.1 | Invite check-in staff | Event → Settings tab | Token created, copy button works |
| [ ] | 9.2 | Open check-in scanner | `/checkin` (with staff token) | Scanner UI loads |
| [ ] | 9.3 | Scan a valid ticket QR | `/checkin` | Success — ticket marked as USED |
| [ ] | 9.4 | Scan the same ticket again | `/checkin` | "Already used" error shown |
| [ ] | 9.5 | Revoke staff invite | Event → Settings tab | Invite status → REVOKED |

---

## Phase 10 — Sidebar & Navigation

| Done | # | Action | Where | Pass Condition |
|------|---|--------|-------|----------------|
| [ ] | 10.1 | Collapse sidebar | Toggle button | Nav shrinks to icon-only rail |
| [ ] | 10.2 | Expand sidebar | Toggle button | Nav labels reappear |
| [ ] | 10.3 | Disputes nav item is blurred | Any workspace | "Soon" pill visible, clicking does nothing |
| [ ] | 10.4 | Notification bell — open panel | Sidebar bell | Notification list renders |
| [ ] | 10.5 | Navigate to an unknown route | `/anything-random` | Redirects to `/` |
| [ ] | 10.6 | Reload any private page while logged in | Any protected route | Page loads correctly (not kicked to login) |

---

## Phase 11 — Edge Cases

| Done | # | Scenario | Expected |
|------|---|----------|----------|
| [ ] | 11.1 | Transfer ticket to email not in system | Inline error from backend |
| [ ] | 11.2 | Transfer a USED ticket | It should not appear in transfer list |
| [ ] | 11.3 | Config tab on a new event | GET /config returns 200 with defaults, no 500 |
| [ ] | 11.4 | Disputes page with zero disputes | Green checkmark empty state, no crash |
| [ ] | 11.5 | Open `/organiser/contracts` | Loads correctly (no redirect to home) |
| [ ] | 11.6 | Event images load on discovery page | No placeholder fallback when URL exists |
| [ ] | 11.7 | Event price never shows "∞" | Math.min guard working |
| [ ] | 11.8 | Vendor name shown in organiser contracts | `vendorName` field mapped |
| [ ] | 11.9 | Logout clears all state | Sidebar gone, `/dashboard` redirects again |

---

## Sign-Off

| Area | Tester | Date | Status |
|------|--------|------|--------|
| Public / Auth | | | |
| Attendee Flow | | | |
| Organiser Flow | | | |
| Admin Panel | | | |
| Vendor Flow | | | |
| Contract Flow | | | |
| Messages | | | |
| Check-In | | | |
| Edge Cases | | | |
