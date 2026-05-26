# EventNest Frontend

**Authors:**  Oluwasemilore Omotade-Michaels, Bassey John
**Date:** 24/05/2026

## Overview

EventNest is a React 19 single-page application that delivers the full user-facing surface for the EventNest platform — event discovery, ticket booking, real-time check-in management, organiser dashboards, vendor marketplace, and admin moderation. It communicates exclusively with the EventNest backend over REST (RTK Query), WebSocket/STOMP (chat), and Server-Sent Events (live notifications).

> **Backend repository:** [jbassie/event-nest-backend](https://github.com/jbassie/event-nest-backend) — Spring Boot 4, Java 21, PostgreSQL, Redis, Kafka. The backend must be running before the frontend can load any data.

The application is a feature-modular SPA. Each vertical slice (auth, events, organiser, vendor, tickets, admin, …) owns its own RTK Query API slice, pages, and components. A single Redux store holds the auth state; all server state is managed by RTK Query with 40+ named cache tags for fine-grained invalidation.

## Architecture

```
Browser
  │
  ├── React SPA (Vite dev server :5173 / Nginx :80 in production)
  │     ├── Redux store     auth slice (JWT token + user), activity slice
  │     ├── RTK Query       all REST calls, 40+ cache tags, optimistic updates
  │     ├── STOMP client    real-time chat over WebSocket/SockJS
  │     └── SSE client      live notification stream (custom @microsoft/fetch-event-source)
  │
  └── Nginx (prod) proxies /api/* → backend:8080, serves SPA fallback for all other routes
```

All API calls are routed through a single `baseApi` instance (`src/services/baseApi.js`). The base URL is read from `VITE_API_BASE_URL` at build time — no hard-coded hostnames anywhere in the application code.

## Assumptions

### Configuration & Infrastructure

1. **Backend URL**: The frontend assumes the backend is reachable at `VITE_API_BASE_URL` (default `http://localhost:8080/api/v1`). All RTK Query slices inherit this base via the shared `baseApi`.

2. **Port**: The Vite dev server runs on **5173** by default. The production Nginx image listens on **80**. The backend must be running on **8080** (or whatever `VITE_API_BASE_URL` points to).

3. **CORS**: The backend must have `http://localhost:5173` listed in `CORS_ALLOWED_ORIGINS` for local development. For production, update that variable to the deployed frontend origin.

4. **Auth Storage**: The JWT access token and user object are held in Redux (in-memory). `localStorage` is used as a persistence layer on page reload only — never for sensitive secrets. The token is attached to every outgoing request via `prepareHeaders` in `baseApi`.

5. **Google OAuth**: `VITE_GOOGLE_CLIENT_ID` is optional. When blank, the "Continue with Google" button is hidden. No part of the app requires Google Sign-In.

6. **Google Maps**: `VITE_GOOGLE_MAPS_API_KEY` is optional. When blank, the venue autocomplete field degrades to a plain text input.

7. **Payments**: Monnify is the payment gateway for ticket bookings. The Monnify widget is loaded from `VITE_MONNIFY_API_KEY` / `VITE_MONNIFY_CONTRACT_CODE`. Bookings without a configured Monnify key will error at the checkout step.

8. **Real-Time Connections**: The SSE stream reconnects automatically on drop. The STOMP client (`src/services/stompService.js`) uses SockJS fallback for environments that block raw WebSocket. Both connections authenticate via the Redux JWT token.

### Data Format

9. **Monetary Amounts**: Prices from the backend are stored in kobo (smallest NGN unit). The `ngn()` utility in `src/utils/currency.js` divides by 100 and formats with `₦` for display. Never pass raw kobo values to the UI.

10. **Dates**: All timestamps from the backend are ISO-8601 UTC strings. `src/utils/dateFormat.js` converts them to human-readable local time using `Intl.DateTimeFormat`.

11. **Pagination**: List endpoints return Spring `Page<T>` envelopes (`{ content: [...], page: { totalElements, totalPages, number, size } }`). RTK Query `transformResponse` extracts `.data.content` and `.data.page` at the API slice level — components never reach into raw envelopes.

12. **IDs**: User IDs are 12-character NanoIDs (string). All other entity IDs are UUID (string). Route params are always UUID unless the route is explicitly slug-based (e.g. `/events/slug/:slug`).

### Business Logic

13. **Role Separation**: The same JWT can activate one of four modes — attendee (default), organiser (`/my-events`), vendor (`/vendor/*`), or admin (`/admin/*`). Vendor mode is toggled via a sidebar switch that sets `vendorModeActive` in local state. Admin routes are guarded by `AdminRoute`, which checks `user.role === 'ADMIN'`.

14. **Event Lifecycle Guard**: Create/edit flows block progression unless required fields are complete. The submit button reads the event `status` field from the API response to determine its label (`Save draft` vs `Save changes` vs `Submit for review`).

15. **Ticket Transfer**: Transfer completes immediately on the backend. The frontend shows a confirmation modal and invalidates the `['Ticket']` cache tag on success. There is no accept/decline step in the UI.

16. **Optimistic Interactions**: Comment likes use optimistic updates (`onQueryStarted` + `undo` on error) for instant feedback without a round-trip spinner.

17. **Offline QR download**: `src/features/tickets/pdf.js` uses `jspdf` to generate and download a ticket PDF client-side. No server round-trip is required after the ticket data is loaded.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 18 | `node --version` |
| npm | 9 | `npm --version` |
| Git | any | `git --version` |

The [EventNest backend](https://github.com/jbassie/event-nest-backend) must be running and healthy before the frontend can load any data. Follow the backend setup guide first.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/jbassie/events-nest-ui.git
cd events-nest-ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create the Environment File

**Linux/Mac:**

```bash
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

If `.env.example` does not exist, create `.env` manually:

```env
# Required — URL of the running EventNest backend API (no trailing slash)
VITE_API_BASE_URL=http://localhost:8080/api/v1

# Optional — Google OAuth client ID (leave blank to disable Google Sign-In)
VITE_GOOGLE_CLIENT_ID=

# Optional — Google Maps Places API key (leave blank to disable venue autocomplete)
VITE_GOOGLE_MAPS_API_KEY=


```

Only `VITE_API_BASE_URL` is required to run the application. All other variables are optional for local development.

### 4. Start the Dev Server

```bash
npm run dev
```

The app opens at **http://localhost:5173**.

> Ensure the backend is already running at `http://localhost:8080` before logging in or loading any data. See [jbassie/event-nest-backend](https://github.com/jbassie/event-nest-backend).

### 5. Verify the App Is Running

1. Open `http://localhost:5173` — the EventNest landing page loads.
2. Click **Register** and create a test account.
3. After logging in you are redirected to the events discovery page.
4. Open the browser developer tools → Network tab and confirm `GET /api/v1/events` returns `200`.
5. Open the browser console — no unhandled errors should appear.

---

## Running Tests

```bash
npm test
```

Tests use **Vitest** + **React Testing Library** + **MSW** to mock all API calls — no backend connection is required for the test suite.

Run with the interactive Vitest UI:

```bash
npm run test:ui
```

The test suite covers:

- **Auth** — login, registration, auth slice reducers, token persistence
- **Events** — discovery page rendering, event detail, create event form
- **Tickets** — ticket list rendering, transfer modal, gift claim flow
- **Comments** — comment card, section, composer, replies panel
- **Admin** — admin page structure, moderation views
- **UI components** — Button, Badge, EventCard, CapacityBar (snapshot + interaction)
- **Utils** — `dateFormat`, currency formatting

---

## Building for Production

```bash
npm run build
```

The production bundle is written to `dist/`. To preview it locally:

```bash
npm run preview
```

---

## Docker Build (Production Image)

The production image uses a multi-stage build: Vite compiles the bundle, then Nginx serves the static files and proxies `/api/*` to the backend.

```bash
docker build -f Dockerfile.frontend -t events-nest-frontend .
```

Run it (backend must be accessible at `http://localhost:8080`):

```bash
docker run -p 80:80 events-nest-frontend
```

Open `http://localhost`. The Nginx config (`nginx.frontend.conf`) handles the SPA fallback (`try_files $uri /index.html`) and the `/api` reverse proxy.

---

## API Documentation

The backend exposes interactive Swagger/OpenAPI documentation at:

- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`

This is the authoritative reference for every endpoint called by the frontend.

---

## Project Structure

```
events-nest-ui/
├── src/
│   ├── App.jsx                     Root component and router outlet
│   ├── main.jsx                    React entry point (Redux Provider, Router)
│   ├── app/
│   │   └── store.js                Redux store (auth slice + RTK Query API)
│   ├── components/ui/              Shared design-system components
│   │   ├── Button.jsx              Primary / secondary / ghost variants
│   │   ├── Modal.jsx               Focus-trapped overlay
│   │   ├── Toast.jsx               Ephemeral notification toasts
│   │   ├── TicketCard.jsx          Reusable ticket display card
│   │   ├── EventCard.jsx           Discovery / browse event card
│   │   ├── TopNav.jsx / TopBar.jsx Navigation headers
│   │   ├── AppShell.jsx            Authenticated layout shell with sidebar
│   │   └── …                       Input, Icon, Badge, Modal, Stack, Tile, …
│   ├── features/                   Vertical feature slices
│   │   ├── auth/                   Login, register, forgot/reset password, authSlice, authApi
│   │   ├── events/                 Discovery, detail, create, edit, programme, my-events, tiersApi
│   │   ├── bookings/               Booking flow, payment result, Monnify integration
│   │   ├── tickets/                Ticket list (grouped by event), transfer modal, gift claim, PDF
│   │   ├── checkin/                Staff check-in scanner, QR decode, offline batch sync
│   │   ├── comments/               Comment section, card, composer, replies panel, commentsApi
│   │   ├── organiser/              Event workspace tabs (Guests, Budget, Contracts, Programme,
│   │   │                           Comments, Ratings, Settings), organiser API slices
│   │   ├── vendor/                 Marketplace, vendor profile, applications, contracts, escrow,
│   │   │                           disputes, vendor API slices
│   │   ├── admin/                  Platform analytics, event moderation, user management,
│   │   │                           escrow disputes, vendor verification, adminApi
│   │   ├── notifications/          Notification inbox, unread badge, notificationsApi
│   │   ├── messages/               Chat conversations, STOMP messaging, messagesApi
│   │   ├── host/                   Host profile management, hostProfilesApi
│   │   ├── settings/               KYC, host profiles settings sections
│   │   ├── activity/               Activity feed, activitySlice
│   │   ├── waitlist/               Tier waitlist join/leave, waitlistApi
│   │   └── landing/                Public landing page
│   ├── routes/
│   │   ├── index.jsx               All route definitions
│   │   ├── PrivateRoute.jsx        Redirects unauthenticated users to /login
│   │   ├── OrganizerRoute.jsx      Guards organiser-only routes
│   │   └── AdminRoute.jsx          Guards admin-only routes (role=ADMIN)
│   ├── services/
│   │   ├── baseApi.js              RTK Query base with JWT auth header injection
│   │   ├── sseClient.js            EventSource wrapper for notification stream
│   │   ├── useSseConnection.js     Hook that manages SSE lifecycle
│   │   └── stompService.js         STOMP/SockJS client for real-time chat
│   ├── utils/
│   │   ├── dateFormat.js           ISO-8601 → human-readable local time
│   │   ├── currency.js             Kobo → ₦ formatting
│   │   ├── decodeJwt.js            JWT payload decode (no verification)
│   │   ├── googleMaps.js           Places API autocomplete helpers
│   │   ├── calendarUtils.js        .ics file generation for Add to Calendar
│   │   └── theme.js                CSS variable theme helpers
│   └── test/
│       ├── setup.js                Vitest global setup (MSW, jest-dom matchers)
│       ├── server.js               MSW mock server with API handlers
│       ├── renderWithProviders.jsx  Test helper — wraps component in Redux + Router
│       ├── components/ui/          UI component tests
│       ├── features/               Feature-level page and slice tests
│       └── utils/                  Utility unit tests
├── docs/                           Frontend design decisions and diagrams
├── Dockerfile.frontend             Multi-stage build (Vite builder + Nginx runtime)
├── nginx.frontend.conf             Nginx config — SPA fallback + /api proxy
├── vite.config.js                  Build, alias (@/ → src/), and Vitest config
├── eslint.config.js                ESLint flat config
├── vercel.json                     Vercel deployment rewrites (SPA fallback)
├── index.html                      Vite HTML entry point
├── package.json                    npm scripts and dependencies
└── README.md                       This file
```

---

## Code Quality Features

- **RTK Query throughout**: No manual `fetch`/`axios` calls. Every endpoint is defined in a typed API slice with `providesTags` / `invalidatesTags` for automatic cache coherence.
- **40+ cache tags**: Fine-grained invalidation ensures stale data is never shown after a mutation (e.g. `Contract`, `Escrow`, `VendorApplication`, `HostProfile`).
- **Optimistic updates**: Comment reactions update the UI instantly via `onQueryStarted` with rollback on failure.
- **Route guards**: `PrivateRoute`, `OrganizerRoute`, and `AdminRoute` enforce auth and role requirements at the router level — no page-level role checks.
- **Shared design system**: All interactive elements use the shared `Button`, `Input`, `Modal`, `Toast`, and `Icon` components. No inline ad-hoc styles for interactive chrome.
- **No magic strings for routes**: All navigation uses constants or template literals over the same path strings used in `routes/index.jsx`.
- **MSW test isolation**: Tests intercept at the network layer. No mocked modules, no spying on RTK Query internals — tests exercise the full component tree against realistic API responses.

---

## Notes

- The app uses React Router v7 with `useNavigate` and `useSearchParams` for SPA navigation. Direct URL access to any route (e.g. `/events/slug/my-event`) works because Nginx and Vercel both rewrite unknown paths to `index.html`.
- The STOMP connection is authenticated via the JWT token passed as a query parameter (`?token=...`) for SockJS compatibility. Raw WebSocket auth uses the `Authorization` header in the CONNECT frame.
- The SSE stream reconnects automatically on drop with exponential back-off handled by `@microsoft/fetch-event-source`.
- Ticket PDFs are generated entirely client-side using `jspdf` — no server involvement after the initial ticket fetch.
- The `.ics` calendar file for "Add to Calendar" is generated client-side in `src/utils/calendarUtils.js`.

---

## Troubleshooting

### "Network Error" / all API calls fail

- Confirm the backend is running: `curl http://localhost:8080/actuator/health`
- Check `VITE_API_BASE_URL` in `.env` — must match the backend's scheme, host, and port exactly, with no trailing slash
- Restart the Vite dev server after changing `.env`

### "CORS error" on API calls

- The backend's `CORS_ALLOWED_ORIGINS` must include `http://localhost:5173` exactly (no trailing slash)
- See the [backend troubleshooting guide](https://github.com/jbassie/event-nest-backend#cors-error-from-the-frontend) for details

### Google Sign-In not showing

- `VITE_GOOGLE_CLIENT_ID` must be set. Get a client ID at [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth 2.0 Client IDs
- Add `http://localhost:5173` to the Authorised JavaScript Origins for that client ID

### Venue autocomplete not working

- `VITE_GOOGLE_MAPS_API_KEY` must be set with the Places API enabled
- The field degrades to a plain text input when the key is missing — this is expected behaviour

### Ticket checkout fails

- `VITE_MONNIFY_API_KEY` and `VITE_MONNIFY_CONTRACT_CODE` must both be set with valid Monnify sandbox credentials
- In local dev, the booking endpoint will still accept requests — only the Monnify modal is affected

### Real-time notifications not arriving

- Check the Network tab for a pending `GET /api/v1/notifications/stream` SSE request (type `fetch`, long-lived)
- Confirm the backend Kafka setup is working; notification events publish after commit
- If the SSE stream shows repeated reconnect attempts, check that the JWT has not expired

### Tests fail to run

- Run `npm install` to ensure `msw`, `vitest`, and `@testing-library/*` are installed
- If MSW shows a service-worker warning, it is expected in jsdom — MSW uses its Node.js interceptor in the test environment

---

## Related Repositories

| Repository | Description |
|---|---|
| [jbassie/event-nest-backend](https://github.com/jbassie/event-nest-backend) | Spring Boot 4, Java 21 — REST API, WebSocket, SSE, PostgreSQL, Redis, Kafka |

---

## License

This project is created for the Moniepoint capstone programme.
