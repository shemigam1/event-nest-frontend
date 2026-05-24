# EventNest UI — Design Decisions

This document records architectural and UX decisions that are intentional and
should not be reversed without understanding the reasoning. Each entry explains
the problem space, the options considered, and the rationale behind the choice
made.

---

## 1. Comments are not a live/SSE-pushed feature

### The feature
The `CommentSection` component displays the discussion thread on each event
detail page. Users can post comments and reply to others.

### Why we do NOT push comments via Server-Sent Events (SSE)

The app already has an SSE channel (`useSseConnection`) that pushes real-time
events to authenticated clients. We deliberately chose **not** to use it for
comments, for the following reasons:

#### 1a. Fan-out cost is O(attendees), not O(1)

Every other SSE event in the app is point-to-point: a new booking notification
goes to the buyer and the organiser — two connections. A new ticket transfer
goes to one recipient. Comments are different: a single comment on a popular
event must be pushed to every person currently viewing that event page.

For an event with 500 simultaneous viewers, one new comment triggers 500
individual SSE pushes from the server, plus 500 RTK Query cache invalidations
on the client side. This is quadratic cost relative to audience size and makes
the SSE channel a bottleneck for high-traffic events.

#### 1b. The event detail page is publicly accessible

Anonymous visitors (not logged in) can read comments on a public event page.
The SSE channel requires authentication — an `Authorization` header is set when
the connection is opened (`useSseConnection` hooks into `selectIsAuthenticated`).
We cannot push comment updates to unauthenticated readers, so any SSE approach
would always be incomplete for anonymous viewers.

#### 1c. Comments are low-urgency social signals

A new ticket confirmation, a payment result, or a transfer arrival are
**high-urgency, user-specific** events — the user is actively waiting for them
and missing them for even a few seconds causes real anxiety. A new discussion
comment is a **low-urgency, social** event. Missing it for 60 seconds is
perfectly acceptable; readers are not blocked waiting for it.

Treating all events with the same real-time urgency wastes infrastructure budget
on low-value updates.

#### 1d. Backend Kafka pressure and complexity

Under the current architecture each new comment would need to:
1. Be published to a Kafka `notifications` topic
2. Be consumed and fanned out to all currently-connected SSE streams for that event
3. Trigger `invalidatesTags: ['Comment']` on every client

The backend has no indexed registry of "which SSE connections are viewing event
X". Building that registry (a concurrent map of `eventId → List<SseEmitter>`)
adds statefulness and memory pressure to the notification service, which is
currently stateless.

#### 1e. Browser SSE connection limits

HTTP/1.1 browsers cap concurrent SSE connections at 6 per domain. A user
browsing multiple event pages simultaneously would exhaust the limit quickly if
each page held a live comment stream.

---

### What we do instead — the hybrid polling + indicator pattern

The solution balances freshness with cost:

| Mechanism | Behaviour |
|---|---|
| **Background poll** | RTK Query `pollingInterval: 60_000` + `skipPollingIfUnfocused: true` — silently refetches every 60 seconds only when the tab is focused |
| **Window-focus refetch** | `refetchOnWindowFocus: true` — immediately fetches when the user returns to the tab after navigating away |
| **"N new comments" banner** | When the background poll resolves with a higher `totalElements` than the last acknowledged count, a blue "N new comments — click to load" bar appears at the top of the thread. The user clicks it to jump to the updated list. |
| **Manual refresh button** | A "Refresh" button in the section header is always available as an explicit escape hatch |

This is the same pattern used by GitHub Issues, Linear, and Notion — you are
**informed** that new content exists rather than having it injected into the UI
under your cursor, which can be disorienting.

### What would change this decision

If the product requirement becomes "users must see new comments in under 5
seconds without any click", the correct solution would be a **WebSocket-based
pub/sub** with an event-scoped room (e.g. `/ws/events/{id}/comments`), not SSE.
WebSockets are bidirectional, support multi-tenancy rooms natively, and do not
hit the 6-connection HTTP/1.1 limit. That would require:

- A dedicated WebSocket endpoint in the backend (Spring WebSocket / STOMP)
- A room registry indexed by `eventId`
- Replacing the polling query with a WebSocket subscription hook on the frontend

Until that requirement exists, the polling + indicator approach is correct.

---

## 2. Transfer tickets complete immediately (no accept gate)

### Decision
When a user transfers a ticket, the transfer is completed atomically on the
backend in a single `POST /tickets/{id}/transfer` call. There is no
"PENDING → accept → COMPLETED" two-step flow.

### Rationale
- **UX friction**: A two-step accept gate requires the recipient to log in, find
  the Transfers tab, and click Accept. This creates a limbo state where the
  sender has lost the ticket but the recipient hasn't formally received it.
- **Email is the delivery mechanism**: The recipient gets an email with the PDF
  ticket and a `.ics` calendar invite attached. This is equivalent to receiving
  a physical ticket in the mail — no further app action needed.
- **Unregistered recipients**: If the recipient has no EventNest account the
  ticket is set to `PENDING_CLAIM` status and the email includes a "create your
  account" CTA. The ticket is held for them until they sign up.
- **QR code rotation**: On transfer the old QR code and short code are
  immediately invalidated via a JPQL `@Modifying` UPDATE (bypassing the
  `updatable = false` column constraint). The recipient receives new credentials.

---

## 3. Programme of Events is gated behind ticket ownership

### Decision
The programme/schedule for an event is not shown on the public event detail
page. It is only accessible to users who have a confirmed booking (ticket),
behind a dedicated `/events/:id/programme` route protected by `PrivateRoute`.

### Rationale
- **Exclusivity as a value signal**: Seeing the detailed running order of the
  event is a benefit of having purchased a ticket — it gives ticket holders a
  reason to return to the app and adds perceived value to the purchase.
- **Spoiler prevention**: For entertainment events (concerts, comedy shows)
  knowing the exact programme before attending may reduce the sense of
  discovery.
- **Organiser control**: Organisers sometimes finalise the programme closer to
  the event date. Hiding it behind ticket ownership means early-access viewers
  (buyers) are the first to see updates, which can be leveraged as a marketing
  signal ("buy now to see the running order").

The event detail page replaces the inline programme section with a clickable
"Programme of Events" card that only renders for ticket holders.

---

## 4. Calendar invites are attached to emails rather than linked

### Decision
Booking confirmation and ticket transfer emails include a `.ics` file as a
binary attachment, not a "Add to Google Calendar" link in the email body.

### Rationale
- **Works offline and in all clients**: An attachment works in Apple Mail,
  Gmail, Outlook, Spark, and any other client without needing to click a URL.
- **Google Calendar link is also on the ticket card**: The UI already provides
  both "Google Calendar" and "Apple / Outlook (.ics)" buttons on each ticket
  card and on the booking confirmation screen. The email attachment complements
  rather than duplicates these.
- **No token expiry risk**: A Google Calendar URL with encoded event data works
  forever. But if event details change (venue update, time change), the link
  becomes stale. An `.ics` attachment captures the state at booking time, which
  is the legally confirmed booking.

---
