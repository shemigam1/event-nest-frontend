import { baseApi } from '@/services/baseApi';

export const ticketsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyTickets: builder.query({
            query: () => '/me/tickets',
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
            invalidatesTags: ['Ticket', 'Transfer'],
            transformResponse: (r) => r?.data ?? r,
        }),

        getIncomingTransfers: builder.query({
            query: () => '/me/transfers/incoming',
            providesTags: ['Transfer'],
            transformResponse: (r) => r?.data ?? [],
        }),

        getOutgoingTransfers: builder.query({
            query: () => '/me/transfers/outgoing',
            providesTags: ['Transfer'],
            transformResponse: (r) => r?.data ?? [],
        }),

        acceptTransfer: builder.mutation({
            query: (transferId) => ({
                url: `/tickets/transfers/${transferId}/accept`,
                method: 'POST',
            }),
            invalidatesTags: ['Ticket', 'Transfer'],
            transformResponse: (r) => r?.data ?? r,
        }),

        declineTransfer: builder.mutation({
            query: (transferId) => ({
                url: `/tickets/transfers/${transferId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Transfer'],
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
    useGetIncomingTransfersQuery,
    useGetOutgoingTransfersQuery,
    useAcceptTransferMutation,
    useDeclineTransferMutation,
    usePreviewGiftQuery,
    useClaimGiftByTokenMutation,
    useGetMyPendingGiftsQuery,
    useClaimGiftByIdMutation,
} = ticketsApi;
