import { baseApi } from '@/services/baseApi';

/**
 * Endpoints under /api/v1/events/{eventId}/check-in.
 *
 * `scanTicket` is the only call made by check-in staff at the gate; the rest
 * are organiser-side CRUD over staff invitations.
 *
 * Field names match the backend CheckInRequest / CheckInResponse exactly:
 *   - body field: `ticketCode`  (NOT `qrCode` — backend silently ignores unknown fields)
 *   - response:   `holderName`, `seatLabel`, `tierName`, `firstScan`, `eventDayLabel`
 */
export const checkinApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        scanTicket: builder.mutation({
            query: ({ eventId, staffToken, ticketCode, eventDayId }) => ({
                url: `/events/${eventId}/check-in/scan`,
                method: 'POST',
                body: {
                    staffToken,
                    ticketCode,          // backend field — NOT qrCode
                    ...(eventDayId ? { eventDayId } : {}),
                },
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
