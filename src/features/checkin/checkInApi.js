import { baseApi } from '@/services/baseApi';

export const checkInApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        checkInTicket: builder.mutation({
            query: ({ eventId, staffToken, qrCode }) => ({
                url: `/events/${eventId}/checkin`,
                method: 'POST',
                body: { staffToken, qrCode },
            }),
            transformResponse: (response) => response.data ?? response,
        }),
        getCheckInInvites: builder.query({
            query: (eventId) => `/events/${eventId}/checkin/invites`,
            providesTags: (result, error, eventId) => [{ type: 'CheckInInvite', id: eventId }],
            transformResponse: (response) => response.data ?? response,
        }),
        createCheckInInvite: builder.mutation({
            query: ({ eventId, name, email }) => ({
                url: `/events/${eventId}/checkin/invites`,
                method: 'POST',
                body: { name, email },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'CheckInInvite', id: eventId }],
            transformResponse: (response) => response.data ?? response,
        }),
        revokeCheckInInvite: builder.mutation({
            query: ({ eventId, inviteId }) => ({
                url: `/events/${eventId}/checkin/invites/${inviteId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'CheckInInvite', id: eventId }],
        }),
    }),
});

export const {
    useCheckInTicketMutation,
    useGetCheckInInvitesQuery,
    useCreateCheckInInviteMutation,
    useRevokeCheckInInviteMutation,
} = checkInApi;
