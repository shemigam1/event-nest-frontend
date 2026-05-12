import { baseApi } from '@/services/baseApi';

/* Guest list & RSVP — gated by EventConfig.guestListEnabled on the backend.
   When the module is off, GET returns 409 "guest list is not enabled".
   Endpoints: see GuestController. */
export const guestsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGuests: builder.query({
            query: (eventId) => `/events/${eventId}/guests`,
            providesTags: (result, error, eventId) => [
                { type: 'Guest', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        addGuest: builder.mutation({
            // sendInvite defaults to true on the backend; pass false to skip
            // the RSVP email.
            query: ({ eventId, name, email, phone, note, sendInvite = true }) => ({
                url: `/events/${eventId}/guests`,
                method: 'POST',
                body: { name, email, phone, note, sendInvite },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Guest', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        updateGuestStatus: builder.mutation({
            query: ({ eventId, guestId, rsvpStatus }) => ({
                url: `/events/${eventId}/guests/${guestId}/status`,
                method: 'PATCH',
                body: { rsvpStatus },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Guest', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        removeGuest: builder.mutation({
            query: ({ eventId, guestId }) => ({
                url: `/events/${eventId}/guests/${guestId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Guest', id: eventId },
            ],
        }),
        // RSVP from an emailed token — public endpoint, called from the
        // attendee's RSVP landing page (not from the organiser flow).
        respondToRsvp: builder.mutation({
            query: ({ token, response }) => ({
                url: `/rsvp`,
                method: 'POST',
                body: { token, response },
            }),
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useGetGuestsQuery,
    useAddGuestMutation,
    useUpdateGuestStatusMutation,
    useRemoveGuestMutation,
    useRespondToRsvpMutation,
} = guestsApi;
