import { fetchEventSource } from '@microsoft/fetch-event-source';
import { baseApi } from './baseApi';

/**
 * SSE client for the EventNest backend.
 *
 * The pipe is purely a *cache-invalidation channel* — when the server pushes
 * a state-change event, we map it to a list of RTK Query tags and let RTK
 * Query refetch whatever needs refetching. We don't keep a separate Redux
 * slice for "live notifications".
 *
 * Auth: the JWT goes in the Authorization header via fetch (the browser's
 * native EventSource can't set headers, which is why we use this lib).
 *
 * Reconnect: handled automatically by fetchEventSource. We mark 401/403
 * as fatal so a logged-out client doesn't hammer the server forever.
 */

class FatalError extends Error {}

/**
 * Map a server-sent event name to the RTK Query tags that need invalidating.
 * Each entry is a function so we can use the event payload (e.g. eventId)
 * to invalidate scoped tags like `{ type: 'Event', id: <uuid> }`.
 *
 * Keep this in sync with SseDispatcher.java event-name constants on the backend.
 */
const TAG_INVALIDATIONS = {
    'booking.confirmed': (p) => [
        'Booking',
        'Ticket',
        'Analytics',
        'Notification',
        ...(p?.eventId ? [
            { type: 'Event', id: p.eventId },
            { type: 'Event', id: `${p.eventId}-tiers` },
        ] : []),
    ],
    'event.approved': (p) => [
        'Event',
        'Notification',
        ...(p?.eventId ? [{ type: 'Event', id: p.eventId }] : []),
    ],
    'event.rejected': (p) => [
        'Event',
        'Notification',
        ...(p?.eventId ? [{ type: 'Event', id: p.eventId }] : []),
    ],
    'ticket.checked-in': () => ['Ticket', 'Analytics'],
};

/**
 * Open the SSE connection. Returns a `close` function that aborts the
 * underlying fetch and stops reconnect attempts.
 */
export function connectSse({ baseUrl, token, dispatch, onEvent }) {
    const ctrl = new AbortController();

    fetchEventSource(`${baseUrl}/notifications/stream`, {
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token}` },
        // Keep the connection alive even when the tab is backgrounded —
        // important so an attendee doesn't miss their own check-in confirmation.
        openWhenHidden: true,

        async onopen(response) {
            const ct = response.headers.get('content-type') || '';
            if (response.ok && ct.includes('text/event-stream')) return;

            if (response.status === 401 || response.status === 403) {
                throw new FatalError(`SSE auth failed (${response.status})`);
            }
            // Anything else is treated as transient — let the lib retry.
            throw new Error(`Unexpected SSE response: ${response.status}`);
        },

        onmessage(msg) {
            // The backend sends an initial `connected` handshake — useful for
            // debugging but no cache impact.
            if (!msg.event || msg.event === 'connected') return;

            let payload = null;
            if (msg.data) {
                try { payload = JSON.parse(msg.data); } catch { /* keep null */ }
            }

            const tagsFn = TAG_INVALIDATIONS[msg.event];
            if (tagsFn) {
                const tags = tagsFn(payload ?? {});
                if (tags.length) dispatch(baseApi.util.invalidateTags(tags));
            }

            onEvent?.(msg.event, payload);
        },

        onerror(err) {
            // Re-throw fatal errors to abort the retry loop.
            if (err instanceof FatalError) throw err;
            // Anything else: log and let the lib reconnect with its built-in backoff.
            // eslint-disable-next-line no-console
            console.warn('[sse] transient error, will retry:', err?.message ?? err);
        },
    }).catch((err) => {
        if (!(err instanceof FatalError)) {
            // eslint-disable-next-line no-console
            console.error('[sse] connection terminated:', err);
        }
    });

    return () => ctrl.abort();
}
