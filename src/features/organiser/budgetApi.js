import { baseApi } from '@/services/baseApi';

export const budgetApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBudgetSummary: builder.query({
            query: (eventId) => `/events/${eventId}/budget`,
            providesTags: (result, error, eventId) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        createBudget: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        updateBudget: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        addLineItem: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget/items`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        markLineItemPaid: builder.mutation({
            query: ({ eventId, itemId, actualAmount }) => ({
                url: `/events/${eventId}/budget/items/${itemId}/paid`,
                method: 'PATCH',
                body: { actualAmount },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        deleteLineItem: builder.mutation({
            query: ({ eventId, itemId }) => ({
                url: `/events/${eventId}/budget/items/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
        }),
    }),
});

export const {
    useGetBudgetSummaryQuery,
    useCreateBudgetMutation,
    useUpdateBudgetMutation,
    useAddLineItemMutation,
    useMarkLineItemPaidMutation,
    useDeleteLineItemMutation,
} = budgetApi;
