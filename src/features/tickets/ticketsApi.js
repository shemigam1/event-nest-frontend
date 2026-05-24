import { baseApi } from '@/services/baseApi';

export const ticketsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyTickets: builder.query({
            query: ({ eventId } = {}) => ({
                url: '/me/tickets',
                params: eventId ? { eventId } : undefined,
            }),
            providesTags: ['Ticket'],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),

        transferTicket: builder.mutation({
            query: ({ ticketId, recipientEmail }) => ({
                url: `/tickets/${ticketId}/transfer`,
                method: 'POST',
                body: { toEmail: recipientEmail },
            }),
            /**
             * Immediately removes the transferred ticket from every getMyTickets
             * cache entry the moment the server confirms success — so the sender
             * never sees their own ticket again even while the background refetch
             * is still in flight.
             *
             * `eventId` is optional extra context forwarded by the UI so we can
             * also patch the per-event cached list when the user transferred from
             * the event-filtered view (/tickets?eventId=…).
             */
            async onQueryStarted({ ticketId, eventId }, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    const removeFn = (draft) => {
                        const idx = draft.findIndex((t) => t.id === ticketId);
                        if (idx !== -1) draft.splice(idx, 1);
                    };
                    // Patch the general (un-filtered) list
                    dispatch(ticketsApi.util.updateQueryData('getMyTickets', undefined, removeFn));
                    // Patch the per-event list if we know the eventId
                    if (eventId) {
                        dispatch(ticketsApi.util.updateQueryData('getMyTickets', { eventId }, removeFn));
                    }
                } catch {
                    // Mutation failed — leave the cache unchanged
                }
            },
            invalidatesTags: ['Ticket'],
            transformResponse: (r) => r?.data ?? r,
        }),

        // ── Gift endpoints ────────────────────────────────────────────────────

        /** Public — fetches gift context before login. No auth token required. */
        previewGift: builder.query({
            query: (token) => `/tickets/claim/${token}/preview`,
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Claim via the raw token from the email link (requires auth). */
        claimGiftByToken: builder.mutation({
            query: (token) => ({
                url: `/tickets/claim/${token}`,
                method: 'POST',
            }),
            invalidatesTags: ['Ticket', 'Gift'],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** All PENDING_CLAIM gifts waiting for the authenticated user. */
        getMyPendingGifts: builder.query({
            query: () => '/me/pending-gifts',
            providesTags: ['Gift'],
            transformResponse: (r) => r?.data ?? [],
        }),

        /** Claim a pending gift by ticket ID — no email link needed. */
        claimGiftById: builder.mutation({
            query: (ticketId) => ({
                url: `/me/gifts/${ticketId}/claim`,
                method: 'POST',
            }),
            invalidatesTags: ['Ticket', 'Gift'],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useGetMyTicketsQuery,
    useTransferTicketMutation,
    usePreviewGiftQuery,
    useClaimGiftByTokenMutation,
    useGetMyPendingGiftsQuery,
    useClaimGiftByIdMutation,
} = ticketsApi;
