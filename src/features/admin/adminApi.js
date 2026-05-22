import { baseApi } from '@/services/baseApi';

export const adminApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAdminEvents: builder.query({
            query: (status = 'PUBLISHED') => `/admin/events?status=${status}`,
            providesTags: ['Event'],
            transformResponse: (r) => {
                const d = r.data ?? r;
                if (d && typeof d === 'object' && 'content' in d) return d;
                const items = Array.isArray(d) ? d : [];
                return { content: items, totalElements: items.length, totalPages: items.length > 0 ? 1 : 0 };
            },
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
            query: ({ status, page, size } = {}) => {
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (page != null) params.append('page', page);
                if (size != null) params.append('size', size);
                const qs = params.toString();
                return qs ? `/admin/vendors?${qs}` : '/admin/vendors';
            },
            providesTags: ['Vendor'],
            transformResponse: (r) => {
                const d = r.data ?? r;
                const content = Array.isArray(d) ? d : (d?.content ?? []);
                const totalElements = d?.page?.totalElements ?? d?.totalElements ?? content.length;
                const totalPages    = d?.page?.totalPages    ?? d?.totalPages    ?? 1;
                return { content, totalElements, totalPages };
            },
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

        /* Event reports */
        getAdminReports: builder.query({
            query: ({ status = 'PENDING', page = 0, size = 20 } = {}) =>
                `/admin/reports?status=${status}&page=${page}&size=${size}`,
            providesTags: ['Report'],
            transformResponse: (r) => {
                const d = r.data ?? r;
                const content = Array.isArray(d) ? d : (d?.content ?? []);
                const totalElements = d?.page?.totalElements ?? d?.totalElements ?? content.length;
                const totalPages    = d?.page?.totalPages    ?? d?.totalPages    ?? 1;
                return { content, totalElements, totalPages };
            },
        }),
        reviewAdminReport: builder.mutation({
            query: ({ reportId, action, adminNote }) => ({
                url: `/admin/reports/${reportId}/review`,
                method: 'PATCH',
                body: { action, adminNote },
            }),
            invalidatesTags: ['Report'],
            transformResponse: (r) => r.data ?? r,
        }),
        submitEventReport: builder.mutation({
            query: ({ eventId, reason, description }) => ({
                url: `/events/${eventId}/report`,
                method: 'POST',
                body: { reason, description },
            }),
            transformResponse: (r) => r.data ?? r,
        }),
    }),
});

export const {
    useGetAdminEventsQuery,
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
    useGetAdminReportsQuery,
    useReviewAdminReportMutation,
    useSubmitEventReportMutation,
} = adminApi;
