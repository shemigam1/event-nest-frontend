import { baseApi } from '@/services/baseApi';

/**
 * Endpoints under /api/v1/events/{eventId}/checkin.
 *
 * `scanTicket` is the only call made by check-in staff at the gate; the rest
 * are organiser-side CRUD over staff invitations.
 */
export const checkinApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        scanTicket: builder.mutation({
            query: ({ eventId, staffToken, qrCode }) => ({
                url: `/events/${eventId}/check-in/scan`,
                method: 'POST',
                // Send the code as both fields — backend resolves whichever matches.
                // This lets staff enter either the UUID (from a scanned QR) or the
                // 8-char shortCode visible below the QR on the ticket.
                body: { staffToken, qrCode, shortCode: qrCode },
            }),
            invalidatesTags: ['Ticket'],
            transformResponse: (response) => response.data ?? response,
        }),
        createCheckInInvite: builder.mutation({
            query: ({ eventId, name, email }) => ({
                url: `/events/${eventId}/check-in/invites`,
                method: 'POST',
                body: { name, email },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-checkin-invites` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        listCheckInInvites: builder.query({
            query: (eventId) => `/events/${eventId}/check-in/invites`,
            providesTags: (result, error, eventId) => [
                { type: 'Event', id: `${eventId}-checkin-invites` },
            ],
            transformResponse: (response) => {
                const d = response?.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),
        revokeCheckInInvite: builder.mutation({
            query: ({ eventId, inviteId }) => ({
                url: `/events/${eventId}/check-in/invites/${inviteId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-checkin-invites` },
            ],
        }),
    }),
});

export const {
    useScanTicketMutation,
    useCreateCheckInInviteMutation,
    useListCheckInInvitesQuery,
    useRevokeCheckInInviteMutation,
} = checkinApi;
