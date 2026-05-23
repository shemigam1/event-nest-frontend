import { baseApi } from '@/services/baseApi';

export const waitlistApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        joinWaitlist: builder.mutation({
            query: ({ eventId, tierId }) => ({
                url: `/events/${eventId}/tiers/${tierId}/waitlist`,
                method: 'POST',
            }),
            transformResponse: (res) => res?.data ?? res,
            invalidatesTags: (_r, _e, { tierId }) => [{ type: 'Waitlist', id: tierId }],
        }),

        leaveWaitlist: builder.mutation({
            query: ({ eventId, tierId }) => ({
                url: `/events/${eventId}/tiers/${tierId}/waitlist`,
                method: 'DELETE',
            }),
            transformResponse: (res) => res?.data ?? res,
            invalidatesTags: (_r, _e, { tierId }) => [{ type: 'Waitlist', id: tierId }],
        }),

        getMyWaitlistPosition: builder.query({
            query: ({ eventId, tierId }) =>
                `/events/${eventId}/tiers/${tierId}/waitlist/me`,
            transformResponse: (res) => res?.data ?? res,
            providesTags: (_r, _e, { tierId }) => [{ type: 'Waitlist', id: tierId }],
        }),
    }),
});

export const {
    useJoinWaitlistMutation,
    useLeaveWaitlistMutation,
    useGetMyWaitlistPositionQuery,
} = waitlistApi;
