import { baseApi } from '@/services/baseApi';

/* Budget tracker — planned vs paid line items + auto-computed revenue/P&L.
   Backend: /api/v1/events/{eventId}/budget  (see BudgetController). */
export const budgetApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // 404 here means "no budget yet for this event" — the caller treats
        // that as a first-run state and shows the CreateBudget CTA.
        getBudgetSummary: builder.query({
            query: (eventId) => `/events/${eventId}/budget`,
            providesTags: (result, error, eventId) => [
                { type: 'Budget', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),
        createBudget: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Budget', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        updateBudget: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Budget', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        addLineItem: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/budget/items`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Budget', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        markLineItemPaid: builder.mutation({
            query: ({ eventId, itemId, actualAmount }) => ({
                url: `/events/${eventId}/budget/items/${itemId}/paid`,
                method: 'PATCH',
                body: { actualAmount },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Budget', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        deleteLineItem: builder.mutation({
            query: ({ eventId, itemId }) => ({
                url: `/events/${eventId}/budget/items/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Budget', id: eventId },
            ],
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
