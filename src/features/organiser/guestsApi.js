import { baseApi } from '@/services/baseApi';

export const guestsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGuests: builder.query({
            query: (eventId) => `/events/${eventId}/guests`,
            providesTags: (result, error, eventId) => [{ type: 'Guest', id: eventId }],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),
        addGuest: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/guests`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Guest', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        updateGuestStatus: builder.mutation({
            query: ({ eventId, guestId, rsvpStatus }) => ({
                url: `/events/${eventId}/guests/${guestId}/status`,
                method: 'PATCH',
                body: { rsvpStatus },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Guest', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        removeGuest: builder.mutation({
            query: ({ eventId, guestId }) => ({
                url: `/events/${eventId}/guests/${guestId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Guest', id: eventId }],
        }),
    }),
});

export const {
    useGetGuestsQuery,
    useAddGuestMutation,
    useUpdateGuestStatusMutation,
    useRemoveGuestMutation,
} = guestsApi;
