import { baseApi } from '@/services/baseApi';

export const adminApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAdminEvents: builder.query({
            query: (status = 'PENDING_APPROVAL') => `/admin/events?status=${status}`,
            providesTags: ['Event'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
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
        cancelEvent: builder.mutation({
            query: (id) => ({ url: `/admin/events/${id}/cancel`, method: 'PATCH' }),
            invalidatesTags: ['Event'],
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
        getEventEdits: builder.query({
            query: (status) => status ? `/admin/event-edits?status=${status}` : '/admin/event-edits',
            providesTags: ['EventEdit'],
            transformResponse: (r) => { const d = r.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
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

        /* ── Escrow disputes ──────────────────────────────────────────── */

        getEscrowDisputes: builder.query({
            query: () => '/admin/escrow/disputes',
            providesTags: ['Escrow'],
            transformResponse: (r) => {
                const d = r.data ?? r;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),

        ruleForVendor: builder.mutation({
            query: ({ disputeId, notes }) => ({
                url: `/admin/escrow/disputes/${disputeId}/rule-for-vendor`,
                method: 'POST',
                body: { notes },
            }),
            invalidatesTags: ['Escrow'],
            transformResponse: (r) => r.data ?? r,
        }),

        ruleForOrganiser: builder.mutation({
            query: ({ disputeId, notes }) => ({
                url: `/admin/escrow/disputes/${disputeId}/rule-for-organiser`,
                method: 'POST',
                body: { notes },
            }),
            invalidatesTags: ['Escrow'],
            transformResponse: (r) => r.data ?? r,
        }),

        /** Admin confirms an escrow violation on a contract — fires the −35 trust event. */
        flagEscrowViolation: builder.mutation({
            query: ({ contractId, reason }) => ({
                url: `/admin/escrow/contracts/${contractId}/flag-violation`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['Escrow', 'Vendor'],
            transformResponse: (r) => r.data ?? r,
        }),

        /* ── Admin vendor management ─────────────────────────────────── */

        /** Paginated vendor list, optionally filtered by status. */
        getAdminVendors: builder.query({
            query: ({ status, page = 0, size = 20 } = {}) => ({
                url: '/admin/vendors',
                params: {
                    ...(status ? { status } : {}),
                    page,
                    size,
                },
            }),
            providesTags: ['Vendor'],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                if (d && Array.isArray(d.content)) return d;
                if (Array.isArray(d)) return { content: d, totalElements: d.length, number: 0, size: d.length };
                return d;
            },
        }),

        getAdminVendorById: builder.query({
            query: (vendorId) => `/admin/vendors/${vendorId}`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: vendorId }],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Approve a vendor's verification → status = VERIFIED. */
        verifyVendor: builder.mutation({
            query: (vendorId) => ({
                url: `/admin/vendors/${vendorId}/verify`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, vendorId) => [
                { type: 'Vendor', id: vendorId },
                'Vendor',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Reject the current verification submission with an explanation. */
        rejectVendorVerification: builder.mutation({
            query: ({ vendorId, reason }) => ({
                url: `/admin/vendors/${vendorId}/reject-verification`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: (result, error, { vendorId }) => [
                { type: 'Vendor', id: vendorId },
                'Vendor',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Suspend the vendor (status → SUSPENDED, removed from marketplace). */
        suspendVendor: builder.mutation({
            query: ({ vendorId, reason }) => ({
                url: `/admin/vendors/${vendorId}/suspend`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: (result, error, { vendorId }) => [
                { type: 'Vendor', id: vendorId },
                'Vendor',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Full audit trail of trust-score deltas for a vendor (newest first). */
        getVendorTrustHistory: builder.query({
            query: (vendorId) => `/admin/vendors/${vendorId}/trust-history`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: `trust-${vendorId}` }],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
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
    useVerifyVendorMutation,
    useRejectVendorVerificationMutation,
    useSuspendVendorMutation,
    useGetVendorTrustHistoryQuery,
} = adminApi;
