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
        getAdminEventById: builder.query({
            query: (id) => `/admin/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (r) => r.data ?? r,
        }),
        getAdminEventBookings: builder.query({
            query: (eventId) => `/admin/events/${eventId}/bookings`,
            providesTags: (result, error, eventId) => [{ type: 'Booking', id: `admin-${eventId}` }],
            transformResponse: (r) => r.data?.content ?? r.data ?? [],
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
        getEventEdits: builder.query({
            query: (status) => status ? `/admin/event-edits?status=${status}` : '/admin/event-edits',
            providesTags: ['EventEdit'],
            transformResponse: (r) => r.data ?? r,
        }),
        approveEventEdit: builder.mutation({
            query: (id) => ({ url: `/admin/event-edits/${id}/approve`, method: 'PATCH' }),
            invalidatesTags: ['EventEdit', 'Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        rejectEventEdit: builder.mutation({
            query: ({ id, reason }) => ({ url: `/admin/event-edits/${id}/reject`, method: 'PATCH', body: { reason } }),
            invalidatesTags: ['EventEdit', 'Event'],
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
    useGetAdminUserByIdQuery,
    useEnableUserMutation,
    useDisableUserMutation,
    useGetEventsByOrganiserQuery,
    useGetAnalyticsQuery,
    useGetAdminEventByIdQuery,
    useGetAdminEventBookingsQuery,
    useGetEventEditsQuery,
    useApproveEventEditMutation,
    useRejectEventEditMutation,
    useInviteAdminMutation,
    useCompleteAdminInvitationMutation,
} = adminApi;
