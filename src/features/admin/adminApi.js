import { baseApi } from '@/services/baseApi';

export const adminApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAdminEvents: builder.query({
            query: (status = 'PENDING_APPROVAL') => `/admin/events?status=${status}`,
            providesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        approveEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/approve`, method: 'PATCH' }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        rejectEvent: builder.mutation({
            query: ({ id, reason }) => ({
                url: `/admin/events/${id}/reject`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        getAdminUsers: builder.query({
            query: () => '/admin/users',
            providesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        getAnalytics: builder.query({
            query: () => '/admin/analytics',
            providesTags: ['Analytics'],
            transformResponse: (r) => r.data ?? r,
        }),
    }),
});

export const {
    useGetAdminEventsQuery,
    useApproveEventMutation,
    useRejectEventMutation,
    useGetAdminUsersQuery,
    useGetAnalyticsQuery,
} = adminApi;
