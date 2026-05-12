import { baseApi } from '@/services/baseApi';

/* Vendor marketplace — applicants submit applications against an event,
   organisers/managers triage the queue. Backend: VendorController.
   No EventConfig gate — vendor module is always available. */
export const vendorsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Organiser side: list applications for an event with optional status filter.
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

        // Applicant side: apply to an event, and list my own applications.
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
    }),
});

export const {
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useApplyAsVendorMutation,
    useGetMyVendorApplicationsQuery,
} = vendorsApi;
