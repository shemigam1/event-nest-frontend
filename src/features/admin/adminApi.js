import { baseApi } from '@/services/baseApi';

export const adminApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAdminEvents: builder.query({
            query: (status = 'PENDING_APPROVAL') => `/admin/events?status=${status}`,
            providesTags: ['Event'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        /* Approve or reject a PENDING_APPROVAL event — single review endpoint */
        approveEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/review`, method: 'POST', body: { approved: true } }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        rejectEvent: builder.mutation({
            query: ({ id, reason }) => ({
                url: `/admin/events/${id}/review`,
                method: 'POST',
                body: { approved: false, reason },
            }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        cancelEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/cancel`, method: 'PATCH' }),
            invalidatesTags: ['Event'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* Users */
        getAdminUsers: builder.query({
            query: () => '/admin/users',
            providesTags: ['User'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
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
        getEventsByOrganiser: builder.query({
            query: (organiserId) => `/admin/events?organiserId=${organiserId}`,
            providesTags: ['Event'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),
        getAnalytics: builder.query({
            query: () => '/admin/analytics',
            providesTags: ['Analytics'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* Event change requests (critical-field edits on published events) */
        getEventEdits: builder.query({
            query: (status) => status ? `/admin/events/change-requests?status=${status}` : '/admin/events/change-requests',
            providesTags: ['EventEdit'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),
        approveEventEdit: builder.mutation({
            query: (id) => ({
                url: `/admin/events/changes/${id}/review`,
                method: 'POST',
                body: { approved: true },
            }),
            invalidatesTags: ['EventEdit', 'Event'],
            transformResponse: (r) => r.data ?? r,
        }),
        rejectEventEdit: builder.mutation({
            query: ({ id, reason }) => ({
                url: `/admin/events/changes/${id}/review`,
                method: 'POST',
                body: { approved: false, reason },
            }),
            invalidatesTags: ['EventEdit', 'Event'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* Admin invitations */
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

        /* Escrow disputes */
        getEscrowDisputes: builder.query({
            query: () => '/admin/escrow/disputes',
            providesTags: ['Escrow'],
            transformResponse: (r) => {
                const d = r.data ?? r;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),
        ruleForVendor: builder.mutation({
            query: ({ milestoneId, notes }) => ({
                url: `/admin/escrow/disputes/${milestoneId}/rule-for-vendor`,
                method: 'PATCH',
                body: { notes },
            }),
            invalidatesTags: ['Escrow'],
            transformResponse: (r) => r.data ?? r,
        }),
        ruleForOrganiser: builder.mutation({
            query: ({ milestoneId, notes }) => ({
                url: `/admin/escrow/disputes/${milestoneId}/rule-for-organiser`,
                method: 'PATCH',
                body: { notes },
            }),
            invalidatesTags: ['Escrow'],
            transformResponse: (r) => r.data ?? r,
        }),
        flagEscrowViolation: builder.mutation({
            query: (contractId) => ({
                url: `/admin/escrow/contracts/${contractId}/flag-violation`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Escrow'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* Admin vendor management */
        getAdminVendors: builder.query({
            query: (status) => status ? `/admin/vendors?status=${status}` : '/admin/vendors',
            providesTags: ['Vendor'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),
        getAdminVendorById: builder.query({
            query: (vendorId) => `/admin/vendors/${vendorId}`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: vendorId }],
            transformResponse: (r) => r.data ?? r,
        }),
        getVendorTrustHistory: builder.query({
            query: (vendorId) => `/admin/vendors/${vendorId}/trust-history`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: `trust-${vendorId}` }],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),
        verifyVendor: builder.mutation({
            query: (vendorId) => ({ url: `/admin/vendors/${vendorId}/verify`, method: 'PATCH' }),
            invalidatesTags: ['Vendor'],
            transformResponse: (r) => r.data ?? r,
        }),
        suspendVendor: builder.mutation({
            query: (vendorId) => ({ url: `/admin/vendors/${vendorId}/suspend`, method: 'PATCH' }),
            invalidatesTags: ['Vendor'],
            transformResponse: (r) => r.data ?? r,
        }),
        rejectVendorVerification: builder.mutation({
            query: ({ vendorId, reason }) => ({
                url: `/admin/vendors/${vendorId}/reject-verification`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['Vendor'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* Admin capacity requests */
        getCapacityRequests: builder.query({
            query: (status = 'PENDING') => `/admin/capacity-requests?status=${status}`,
            providesTags: ['Event'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),
        reviewCapacityRequest: builder.mutation({
            query: ({ requestId, approved, reason }) => ({
                url: `/admin/capacity-requests/${requestId}/review`,
                method: 'POST',
                body: { approved, reason },
            }),
            invalidatesTags: ['Event'],
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
    useGetEscrowDisputesQuery,
    useRuleForVendorMutation,
    useRuleForOrganiserMutation,
    useFlagEscrowViolationMutation,
    useGetAdminVendorsQuery,
    useGetAdminVendorByIdQuery,
    useGetVendorTrustHistoryQuery,
    useVerifyVendorMutation,
    useSuspendVendorMutation,
    useRejectVendorVerificationMutation,
    useGetCapacityRequestsQuery,
    useReviewCapacityRequestMutation,
} = adminApi;
