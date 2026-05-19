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
    }),
});

export const { useGetMyTicketsQuery } = ticketsApi;
