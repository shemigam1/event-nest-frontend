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
            invalidatesTags: ['Ticket'],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const { useGetMyTicketsQuery, useTransferTicketMutation } = ticketsApi;
