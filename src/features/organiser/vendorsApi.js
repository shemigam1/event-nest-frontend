import { baseApi } from '@/services/baseApi';

export const vendorsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getVendors: builder.query({
            query: ({ serviceType } = {}) => ({
                url: '/vendors',
                params: serviceType ? { serviceType } : undefined,
            }),
            providesTags: ['Vendor'],
            transformResponse: (r) => { const d = r?.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        getMyVendorVerification: builder.query({
            query: () => '/vendor-verification/me',
            providesTags: ['VendorVerification'],
            transformResponse: (r) => r?.data ?? r,
        }),

        getEventVendorApplications: builder.query({
            query: ({ eventId, status } = {}) => ({
                url: `/events/${eventId}/vendor-applications`,
                params: status ? { status } : undefined,
            }),
            providesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => { const d = r?.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        acceptVendorApplication: builder.mutation({
            query: ({ eventId, applicationId }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/accept`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        rejectVendorApplication: builder.mutation({
            query: ({ eventId, applicationId }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/reject`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        rateVendor: builder.mutation({
            query: ({ eventId, applicationId, score, comment }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/rate`,
                method: 'POST',
                body: { score, comment },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
                'Vendor',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        getMyVendorApplications: builder.query({
            // Backend route is /api/v1/me/vendor-applications (VendorApplicationController).
            // The previous /vendor-applications/mine was a frontend-only convention that 404'd.
            query: () => '/me/vendor-applications',
            providesTags: ['VendorApplicationMine'],
            transformResponse: (r) => { const d = r?.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        applyAsVendor: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/vendor-applications`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['VendorApplicationMine'],
            transformResponse: (r) => r?.data ?? r,
        }),

        getVendorProfile: builder.query({
            query: (vendorId) => `/vendors/${vendorId}/profile`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: vendorId }],
            transformResponse: (r) => r?.data ?? r,
        }),

        applyForVerification: builder.mutation({
            query: (body) => ({
                url: '/vendor-verification/apply',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['VendorVerification'],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useGetVendorsQuery,
    useGetMyVendorVerificationQuery,
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useRateVendorMutation,
    useGetMyVendorApplicationsQuery,
    useApplyAsVendorMutation,
    useGetVendorProfileQuery,
    useApplyForVerificationMutation,
} = vendorsApi;
