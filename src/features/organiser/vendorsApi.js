import { baseApi } from '@/services/baseApi';

/* Vendor marketplace — applicants submit applications against an event,
   organisers/managers triage the queue. Backend: VendorController.
   No EventConfig gate — vendor module is always available. */
export const vendorsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /* ── Organiser: inbound applications on an event ─────────────────── */
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

        /* ── Applicant: apply to an event and track own submissions ─────── */
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

        /* ── Public vendor marketplace directory ─────────────────────────── */
        getVendors: builder.query({
            query: ({ category, search, page = 0 } = {}) => {
                const p = new URLSearchParams();
                if (category && category !== 'all') p.set('category', category);
                if (search) p.set('search', search);
                if (page) p.set('page', page);
                const qs = p.toString();
                return `/vendors${qs ? `?${qs}` : ''}`;
            },
            providesTags: ['VendorProfile'],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        getVendorById: builder.query({
            query: (vendorId) => `/vendors/${vendorId}`,
            providesTags: (result, error, vendorId) => [{ type: 'VendorProfile', id: vendorId }],
            transformResponse: (response) => response?.data ?? response,
        }),
        getVendorSchedule: builder.query({
            query: (vendorId) => `/vendors/${vendorId}/schedule`,
            providesTags: (result, error, vendorId) => [{ type: 'VendorProfile', id: `${vendorId}-schedule` }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        getVendorCompletedWork: builder.query({
            query: (vendorId) => `/vendors/${vendorId}/completed`,
            providesTags: (result, error, vendorId) => [{ type: 'VendorProfile', id: `${vendorId}-completed` }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        /* ── Own vendor profile (any user can create one) ────────────────── */
        getMyVendorProfile: builder.query({
            query: () => '/me/vendor-profile',
            providesTags: ['MyVendorProfile'],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),
        upsertMyVendorProfile: builder.mutation({
            query: (body) => ({
                url: '/me/vendor-profile',
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['MyVendorProfile', 'VendorProfile'],
            transformResponse: (response) => response?.data ?? response,
        }),
        applyForVerification: builder.mutation({
            query: () => ({ url: '/me/vendor-profile/apply-verification', method: 'POST' }),
            invalidatesTags: ['MyVendorProfile'],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* ── Organiser: vendor inquiries on a specific event ─────────────── */
        getEventVendorInquiries: builder.query({
            query: (eventId) => `/events/${eventId}/vendor-inquiries`,
            providesTags: (result, error, eventId) => [{ type: 'VendorInquiry', id: eventId }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        openVendorInquiry: builder.mutation({
            query: ({ eventId, vendorId, message }) => ({
                url: `/events/${eventId}/vendor-inquiries`,
                method: 'POST',
                body: { vendorId, message },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'VendorInquiry', id: eventId }],
            transformResponse: (response) => response?.data ?? response,
        }),
        getInquiryMessages: builder.query({
            query: ({ eventId, inquiryId }) => `/events/${eventId}/vendor-inquiries/${inquiryId}/messages`,
            providesTags: (result, error, { inquiryId }) => [{ type: 'InquiryMessage', id: inquiryId }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        sendInquiryMessage: builder.mutation({
            query: ({ eventId, inquiryId, body }) => ({
                url: `/events/${eventId}/vendor-inquiries/${inquiryId}/messages`,
                method: 'POST',
                body: { body },
            }),
            invalidatesTags: (result, error, { inquiryId }) => [{ type: 'InquiryMessage', id: inquiryId }],
            transformResponse: (response) => response?.data ?? response,
        }),

        /* ── Admin: vendor verification queue ────────────────────────────── */
        getAdminVendorVerificationQueue: builder.query({
            query: () => '/admin/vendor-verification',
            providesTags: ['AdminVendorVerification'],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        approveVendorVerification: builder.mutation({
            query: (applicationId) => ({
                url: `/admin/vendor-verification/${applicationId}/approve`,
                method: 'PATCH',
            }),
            invalidatesTags: ['AdminVendorVerification', 'VendorProfile'],
            transformResponse: (response) => response?.data ?? response,
        }),
        rejectVendorVerification: builder.mutation({
            query: ({ applicationId, reason }) => ({
                url: `/admin/vendor-verification/${applicationId}/reject`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['AdminVendorVerification'],
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useApplyAsVendorMutation,
    useGetMyVendorApplicationsQuery,
    useGetVendorsQuery,
    useGetVendorByIdQuery,
    useGetVendorScheduleQuery,
    useGetVendorCompletedWorkQuery,
    useGetMyVendorProfileQuery,
    useUpsertMyVendorProfileMutation,
    useApplyForVerificationMutation,
    useGetEventVendorInquiriesQuery,
    useOpenVendorInquiryMutation,
    useGetInquiryMessagesQuery,
    useSendInquiryMessageMutation,
    useGetAdminVendorVerificationQueueQuery,
    useApproveVendorVerificationMutation,
    useRejectVendorVerificationMutation,
} = vendorsApi;
