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

## 4. Reply count is derived server-side, not counted client-side

### Decision
`CommentResponse` includes an explicit `replyCount: int` field populated in the
`from()` factory as `replies != null ? replies.size() : 0`. The frontend does not
count `comment.replies.length`.

### Rationale
- **Always present**: A derived int field is always serialised by Jackson (primitives
  are never omitted by `@JsonInclude(NON_NULL)`), so the frontend can safely read
  `comment.replyCount` without a null-check or optional-chaining fallback.
- **Avoids Lombok/Jackson is-prefix trap**: Boolean fields named `isXxx` on a
  primitive `boolean` generate an `isXxx()` getter. Jackson strips the `is` prefix
  and serialises the field as `xxx` — `isActive` → `"active"`, `isPublic` →
  `"public"`. Frontend code must read `pool.active` / `pool.public`, **not**
  `pool.isActive` / `pool.isPublic`. This same trap affects all Lombok DTOs with
  primitive boolean fields and is documented here as the canonical reference.
- **Discoverability**: The previous behaviour gated the "View replies" button on
  `comment.replyCount > 0`. Since `replyCount` was absent from the JSON the button
  was permanently hidden, making threads invisible to readers.

### What the reply indicator looks like
A pill badge (outlined when collapsed, solid blue when open) with a 💬 icon and
count: "1 reply", "3 replies". It is always rendered for comments that have
replies, replacing the previous plain-text ghost button that was easy to miss.

---

## 5. Contribution Pool is separate from ticket revenue on the Live Dashboard

### Decision
`EventAnalyticsResponse.totalRevenue` counts **ticket revenue only** (PAID bookings).
Contribution pool receipts are tracked separately as `contributionRevenue` in
`BudgetViewResponse` and surface exclusively in the Budget P&L tab.

### Rationale
- **Different nature of income**: Ticket revenue is contractual — a booking creates
  a legal obligation. A contribution is a voluntary gift with no guaranteed
  delivery. Mixing them on the Live Dashboard would inflate the "revenue" figure
  shown alongside booking counts in a misleading way.
- **Budget P&L is the right home**: The Budget tab already models income vs expenses
  as a full P&L. `totalIncome = ticketRevenue + contributionRevenue` and
  `net = totalIncome − totalExpenses`. Contributions belong there.
- **Organiser expectation**: An organiser checking the Live Dashboard wants to know
  how many tickets sold and for how much. Contributions are a bonus, not a
  primary sales metric.

### Income calculation in BudgetServiceImpl
```
ticketRevenue       = SUM(booking.totalPrice WHERE status=PAID) ÷ 100   [kobo→naira]
contributionRevenue = SUM(contribution.amount WHERE status=CONFIRMED) ÷ 100  [kobo→naira]
totalIncome         = ticketRevenue + contributionRevenue
net                 = totalIncome − totalExpenses
```

Both sides are divided by 100 because **all monetary amounts in this system are
stored in kobo** (including contribution amounts, which the contribution form
multiplies by 100 before sending to the backend).

---

## 6. Contribution amounts are stored in kobo; forms accept naira

### Decision
All monetary amounts in EventNest — ticket prices, booking totals, contribution
amounts — are stored in the database in **kobo** (1 NGN = 100 kobo). User-facing
forms that accept contribution amounts collect values in **naira** and multiply by
100 (`nairaToKobo()`) before sending to the backend.

### Rationale
- **Consistency**: Ticket prices and booking totals have always been stored in kobo.
  Keeping contributions in the same unit means `BudgetServiceImpl` can add the two
  income streams without a unit conversion between them.
- **Precision**: Integer kobo arithmetic avoids floating-point rounding on fractional
  naira amounts. BigDecimal handles the ÷100 display conversion.
- **UX**: Users think in naira, not kobo. Asking someone to type "100000" to
  contribute ₦1,000 is a guaranteed source of input errors. The form accepts naira
  (with quick-pick chips at ₦1,000 / ₦2,500 / ₦5,000 / ₦10,000) and converts
  transparently.

### Helper functions (`src/utils/currency.js`)
| Function | Input | Output | Use case |
|---|---|---|---|
| `formatNaira(kobo)` | kobo | "₦1,000" | Ticket prices, booking totals, pool summary |
| `nairaToKobo(naira)` | naira | kobo int | Before sending contribution amount to backend |
| `formatNairaDirect(naira)` | naira | "₦1,000" | Quick-pick chip labels; success banner |

### Pitfall to avoid
Do **not** pass a kobo value to `formatNairaDirect` or a naira value to `formatNaira`.
Both produce silent arithmetic errors that are only visible in the rendered output.

---

## 7. "Private" contribution pool means hidden from anonymous visitors only

### Decision
A contribution pool with `isPublic = false` is hidden from **unauthenticated
(anonymous) visitors** on the public event page. Signed-in users can still see and
contribute to a private pool via the event detail page.

### Rationale
- **Use case**: An organiser may want to fundraise from their registered attendees
  without showing contribution progress to casual browsers — e.g. an internal team
  fund, a surprise party pool, or a campaign they want to soft-launch first.
- **Not organiser-only**: Making a pool private does not restrict it to the organiser.
  Any authenticated user who lands on the event page will see the
  `ContributionWidget` and can contribute. Anonymous visitors get a backend 404
  and the widget renders nothing.
- **Backend enforcement**: `ContributionServiceImpl.getPool()` throws
  `ResourceNotFoundException` when `!pool.isPublic() && requesterEmail == null`,
  which the frontend maps to "no pool" (renders null). Authenticated requests always
  proceed.

### UI labels
The toggle is labelled **"Show to guests" / "Hide from guests"** (not
"Make public / Make private") to make the actual effect obvious to the organiser.
A one-line explanation below the toggle confirms the current visibility state in
plain English.

---

## 8. User IDs use NanoID (12-char string), not UUID

### The implementation

```java
// User.java — @PrePersist hook
this.id = NanoIdUtils.randomNanoId(
    NanoIdUtils.DEFAULT_NUMBER_GENERATOR,  // SecureRandom
    NanoIdUtils.DEFAULT_ALPHABET,          // A-Za-z0-9_-  (64 chars)
    12);                                   // length
```

`User.id` is declared as `@Column(length = 12)` and typed `String`. Every other
entity in the system (`Event`, `Ticket`, `Booking`, `ContributionPool`, etc.)
uses `UUID`. This is intentional and asymmetric by design.

### Why NanoID was chosen for User IDs specifically

#### Compact in every context where a userId travels

The user ID appears in:
- **JWT `sub` claim** — every authenticated request carries it
- **Kafka notification payloads** — every notification event embeds `userId`
- **Denormalised `String` columns** — `Notification.userId`,
  `PasswordResetToken.userId`, `WaitlistEntry.userId` store the raw string
- **API paths** — e.g. `GET /events/{eventId}/managers/{userId}`

A UUID serialised as a string is 36 characters. A NanoID of length 12 is
12 characters. Across thousands of Kafka messages per second and millions of
JWT verifications, the compactness reduces wire size, parse time, and index
storage without losing uniqueness.

#### URL-safe out of the box

NanoID's default alphabet (`A-Za-z0-9_-`) contains no characters that require
percent-encoding in a URL, no quotes that need escaping in JSON, and no
characters that break CSV or log formats. UUID strings contain hyphens and
hex digits — also URL-safe — but at 3× the length.

#### No coordination required (distributed-safe generation)

`NanoIdUtils.randomNanoId()` uses `SecureRandom` and runs entirely in the
application process. There is no database round-trip, no sequence, and no
central authority. Any number of horizontally-scaled app instances can generate
valid, globally-unique IDs independently. This property is preserved in a
distributed deployment.

#### Entropy is sufficient at this scale

With a 64-character alphabet and length 12:
```
64^12 = 2^72 ≈ 4.7 × 10^21 possible IDs
```
At one million new users per day, the expected time to first collision exceeds
the age of the universe. Contrast with UUID v4 (122 random bits = 2^122) which
is theoretically safer, but the margin beyond 2^72 is irrelevant in practice.

---

### Performance implications

#### Current single-node system

| Concern | Impact |
|---|---|
| **Storage per user row** | VARCHAR(12) = 12 bytes. UUID type = 16 bytes binary, or 36 bytes as text. NanoID wins. |
| **PK index entry size** | 12 bytes. Smaller entries = more index entries per B-tree page = fewer page reads per lookup. |
| **Write performance** | Random IDs cause B-tree **page splits** on the PK index. This is the same problem as UUID v4. For the `users` table (low write frequency) this is negligible. |
| **Read by userId** | VARCHAR(12) equality comparison is fast; the index is well-fitting. |
| **JOIN cost** | `event_memberships.user_id` is VARCHAR(12) FK. Joining `users` on PK = FK is an indexed equality scan. No cross-type cast. |

The user table is not a high-write table (registrations are infrequent relative
to bookings or notifications), so the page-split cost of random IDs does not
materialise in practice.

#### If EventNest moves to a distributed / microservice architecture

**✅ Stays correct**
- ID generation remains coordination-free. No Zookeeper, no sequence service.
- URL-safe IDs route cleanly through API gateways, message headers, and log
  aggregators without encoding.
- JWT size stays small — important if every microservice validates the token.

**⚠️ Risks and mitigations to plan for**

| Risk | Detail | Mitigation |
|---|---|---|
| **No temporal ordering** | NanoID is random — you cannot sort by `id` to get insertion order, and you cannot do range scans. This is the same as UUID v4. | Always sort by `createdAt`. Never rely on ID ordering. |
| **B-tree fragmentation at scale** | If the users table grows to tens of millions of rows, random inserts cause significant index fragmentation. | Switch to **UUID v7** or **ULID** (time-ordered, distributed) when user volume demands it. UUID v7 is 128-bit and time-prefixed; index inserts are monotonically ordered, eliminating page splits. |
| **Mixed ID scheme** | Users = String/NanoID. Everything else = UUID. Services consuming Kafka events must know which entity types carry which ID type. | Document per-entity ID types in the API contract. In a service mesh, include an `idType` field in schema registries. |
| **No shard key embedded** | NanoID carries no topology hint. Snowflake IDs embed a worker/datacenter ID so a service can route to the correct shard by inspecting the ID. | If horizontal sharding of `users` becomes necessary, a migration to a Snowflake-style ID is required. Until then, shard on a consistent hash of the NanoID string. |
| **Entropy gap vs UUID v4** | 72-bit vs 122-bit. Still astronomically safe at any realistic EventNest user volume. | Not a practical risk. Document and move on. |
| **Non-standard format** | UUID is universally understood by ORMs, databases, and engineers. NanoID requires knowing the library and length. | Always annotate `@Column(length = 12)` clearly. Include this document in onboarding. |

---

### What would change this decision

| Trigger | Recommended migration |
|---|---|
| Registration volume exceeds ~10M users and index fragmentation becomes measurable | Migrate User IDs to **UUID v7** (monotonic, 128-bit, standard). UUID v7 is time-ordered so B-tree inserts are sequential. |
| Horizontal sharding of the users table required | Migrate to **Snowflake ID** (64-bit, embeds timestamp + worker ID + sequence). Requires a coordination service for worker ID assignment. |
| Full microservice decomposition where all services must use a single ID standard | Standardise on **UUID v7** across all entities for uniformity. NanoID stays only if the JWT/URL compactness gain outweighs the non-standard cost. |

Until any of those triggers apply, NanoID length-12 is the right choice: it is
compact, URL-safe, coordination-free, and entropy is more than adequate.

---

## 9. Calendar invites are attached to emails rather than linked

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
