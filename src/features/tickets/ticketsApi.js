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
    }),
});

export const {
    useGetMyTicketsQuery,
    useTransferTicketMutation,
    useGetIncomingTransfersQuery,
    useGetOutgoingTransfersQuery,
    useAcceptTransferMutation,
    useDeclineTransferMutation,
} = ticketsApi;
