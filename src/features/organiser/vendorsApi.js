import { baseApi } from '@/services/baseApi';

/* Vendor marketplace — per-event applications + platform-wide vendor
   verification + the rate-vendor flow. Backend: VendorController.
   No EventConfig gate on any of these. */
export const vendorsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /* ── Organiser: per-event vendor applications ────────────────────── */
        getEventVendorApplications: builder.query({
            query: ({ eventId, status }) => {
                const params = status && status !== 'all' ? `?status=${status}` : '';
                return `/events/${eventId}/vendor-applications${params}`;
            },
            providesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        acceptVendorApplication: builder.mutation({
            query: ({ eventId, applicationId }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/accept`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        rejectVendorApplication: builder.mutation({
            query: ({ eventId, applicationId }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/reject`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* Rate a vendor after the event has ended. Re-callable to update. */
        rateVendor: builder.mutation({
            query: ({ eventId, applicationId, score, comment }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/rate`,
                method: 'POST',
                body: { score, comment },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
                'VendorProfile',
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* ── Applicant: apply for an event + track own submissions ───────── */
        applyAsVendor: builder.mutation({
            query: ({ eventId, serviceType, description, proposedAmount }) => ({
                url: `/events/${eventId}/vendor-applications`,
                method: 'POST',
                body: { serviceType, description, proposedAmount },
            }),
            invalidatesTags: ['VendorApplicationMine'],
            transformResponse: (response) => response?.data ?? response,
        }),
        getMyVendorApplications: builder.query({
            query: () => '/vendor-applications/mine',
            providesTags: ['VendorApplicationMine'],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        /* ── Public marketplace (verified vendors only) ──────────────────── */
        /* Backend only accepts ?serviceType= (partial, case-insensitive
           match). No category/search/page params — filter client-side. */
        getVendors: builder.query({
            query: ({ serviceType } = {}) => {
                const qs = serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : '';
                return `/vendors${qs}`;
            },
            providesTags: ['VendorProfile'],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        /* Single combined endpoint — returns rating summary, upcomingSchedule[]
           and completedWork[] in one payload. */
        getVendorProfile: builder.query({
            query: (vendorId) => `/vendors/${vendorId}/profile`,
            providesTags: (result, error, vendorId) => [
                { type: 'VendorProfile', id: vendorId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* ── My platform vendor verification ─────────────────────────────── */
        /* Note: "verification" is the only vendor-profile primitive in this
           build. Service type + description live on the user record. */
        getMyVendorVerification: builder.query({
            query: () => '/vendor-verification/me',
            providesTags: ['MyVendorVerification'],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),
        applyForVerification: builder.mutation({
            query: ({ serviceType, description }) => ({
                url: '/vendor-verification/apply',
                method: 'POST',
                body: { serviceType, description },
            }),
            invalidatesTags: ['MyVendorVerification', 'VendorProfile'],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* ── Admin: verification queue ───────────────────────────────────── */
        getAdminVendorVerifications: builder.query({
            query: ({ status = 'PENDING' } = {}) =>
                `/admin/vendor-verifications?status=${status}`,
            providesTags: ['AdminVendorVerification'],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        approveVendorVerification: builder.mutation({
            query: (userId) => ({
                url: `/admin/vendor-verifications/${userId}/approve`,
                method: 'PATCH',
            }),
            invalidatesTags: ['AdminVendorVerification', 'VendorProfile', 'MyVendorVerification'],
            transformResponse: (response) => response?.data ?? response,
        }),
        rejectVendorVerification: builder.mutation({
            query: ({ userId, reason }) => ({
                url: `/admin/vendor-verifications/${userId}/reject`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['AdminVendorVerification', 'MyVendorVerification'],
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    // Per-event applications
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useRateVendorMutation,

    // Applicant
    useApplyAsVendorMutation,
    useGetMyVendorApplicationsQuery,

    // Marketplace + profile
    useGetVendorsQuery,
    useGetVendorProfileQuery,

    // My verification
    useGetMyVendorVerificationQuery,
    useApplyForVerificationMutation,

    // Admin
    useGetAdminVendorVerificationsQuery,
    useApproveVendorVerificationMutation,
    useRejectVendorVerificationMutation,
} = vendorsApi;
