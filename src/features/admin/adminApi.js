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
        cancelEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/cancel`, method: 'PATCH' }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        getAdminUsers: builder.query({
            query: () => '/admin/users',
            providesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        updateUserStatus: builder.mutation({
            query: ({ id, enabled }) => ({
                url: `/admin/users/${id}/status`,
                method: 'PATCH',
                body: { enabled },
            }),
            invalidatesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        getAnalytics: builder.query({
            query: () => '/admin/analytics',
            providesTags: ['Analytics'],
            transformResponse: (r) => r.data ?? r,
        }),
        inviteAdmin: builder.mutation({
            query: ({ email }) => ({
                url: '/admin/invite',
                method: 'POST',
                body: { email },
            }),
            invalidatesTags: ['User'],
            transformResponse: (r) => r.data ?? r,
        }),
        completeAdminInvitation: builder.mutation({
            query: ({ token, firstName, lastName, password }) => ({
                url: '/admin/invite/complete',
                method: 'POST',
                body: { token, firstName, lastName, password },
            }),
            transformResponse: (r) => r.data ?? r,
        }),
    }),
});

export const {
    useGetAdminEventsQuery,
    useApproveEventMutation,
    useRejectEventMutation,
    useCancelEventMutation,
    useGetAdminUsersQuery,
    useUpdateUserStatusMutation,
    useGetAnalyticsQuery,
    useInviteAdminMutation,
    useCompleteAdminInvitationMutation,
} = adminApi;
