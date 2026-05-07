import { baseApi } from '@/services/baseApi';

export const tiersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createTier: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/tiers`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-tiers` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        deleteTier: builder.mutation({
            query: ({ eventId, tierId }) => ({
                url: `/events/${eventId}/tiers/${tierId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-tiers` },
            ],
        }),
    }),
});

export const { useCreateTierMutation, useDeleteTierMutation } = tiersApi;
