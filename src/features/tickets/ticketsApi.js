import { baseApi } from '@/services/baseApi';

export const ticketsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyTickets: builder.query({
            query: () => '/me/tickets',
            providesTags: ['Ticket'],
            transformResponse: (response) => response.data ?? response,
        }),
    }),
});

export const { useGetMyTicketsQuery } = ticketsApi;
