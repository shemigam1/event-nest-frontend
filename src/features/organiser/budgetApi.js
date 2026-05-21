import { baseApi } from '@/services/baseApi';

export const budgetApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBudgetSummary: builder.query({
            query: (eventId) => `/organiser/events/${eventId}/budget`,
            providesTags: (result, error, eventId) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        updateBudget: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/organiser/events/${eventId}/budget`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        addLineItem: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/organiser/events/${eventId}/budget/items`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        markLineItemPaid: builder.mutation({
            query: ({ eventId, itemId, actualAmount }) => ({
                url: `/organiser/events/${eventId}/budget/items/${itemId}/paid`,
                method: 'PATCH',
                body: { actualAmount },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        deleteLineItem: builder.mutation({
            query: ({ eventId, itemId }) => ({
                url: `/organiser/events/${eventId}/budget/items/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Budget', id: eventId }],
        }),
    }),
});

export const {
    useGetBudgetSummaryQuery,
    useUpdateBudgetMutation,
    useAddLineItemMutation,
    useMarkLineItemPaidMutation,
    useDeleteLineItemMutation,
} = budgetApi;

// Legacy alias — kept so any component still importing useCreateBudgetMutation compiles.
export const useCreateBudgetMutation = budgetApi.endpoints.updateBudget.useMutation;
