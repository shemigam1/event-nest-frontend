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
        getAdminUserById: builder.query({
            query: (id) => `/admin/users/${id}`,
            providesTags: (result, error, id) => [{ type: 'User', id }],
            transformResponse: (r) => r.data ?? r,
        }),
        enableUser: builder.mutation({
            query: (id) => ({ url: `/admin/users/${id}/enable`, method: 'PATCH' }),
            invalidatesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        disableUser: builder.mutation({
            query: (id) => ({ url: `/admin/users/${id}/disable`, method: 'PATCH' }),
            invalidatesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        cancelEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/cancel`, method: 'PATCH' }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        getEventsByOrganiser: builder.query({
            query: (organiserId) => `/admin/events?organiserId=${organiserId}`,
            providesTags: ['Event'],
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
    useGetAdminUserByIdQuery,
    useEnableUserMutation,
    useDisableUserMutation,
    useCancelEventMutation,
    useGetEventsByOrganiserQuery,
    useGetAnalyticsQuery,
} = adminApi;
