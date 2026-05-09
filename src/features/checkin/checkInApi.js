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
                url: `/events/${eventId}/checkin`,
                method: 'POST',
                body: { staffToken, qrCode },
            }),
            invalidatesTags: ['Ticket'],
            transformResponse: (response) => response.data ?? response,
        }),
        createCheckInInvite: builder.mutation({
            query: ({ eventId, name, email }) => ({
                url: `/events/${eventId}/checkin/invites`,
                method: 'POST',
                body: { name, email },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-checkin-invites` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        listCheckInInvites: builder.query({
            query: (eventId) => `/events/${eventId}/checkin/invites`,
            providesTags: (result, error, eventId) => [
                { type: 'Event', id: `${eventId}-checkin-invites` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        revokeCheckInInvite: builder.mutation({
            query: ({ eventId, inviteId }) => ({
                url: `/events/${eventId}/checkin/invites/${inviteId}`,
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
