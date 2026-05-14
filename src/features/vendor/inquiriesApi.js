import { baseApi } from '@/services/baseApi';

export const inquiriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        sendInquiry: builder.mutation({
            query: ({ eventId, vendorId, message, serviceType }) => ({
                url: `/events/${eventId}/vendor-inquiries`,
                method: 'POST',
                body: { vendorId, message, serviceType },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Inquiry', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        getEventInquiries: builder.query({
            query: (eventId) => `/events/${eventId}/vendor-inquiries`,
            providesTags: (result, error, eventId) => [
                { type: 'Inquiry', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),

        getReceivedInquiries: builder.query({
            query: () => '/vendor-inquiries/received',
            providesTags: ['InquiryReceived'],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),

        closeInquiry: builder.mutation({
            query: (inquiryId) => ({
                url: `/vendor-inquiries/${inquiryId}/close`,
                method: 'PATCH',
            }),
            invalidatesTags: ['InquiryReceived'],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useSendInquiryMutation,
    useGetEventInquiriesQuery,
    useGetReceivedInquiriesQuery,
    useCloseInquiryMutation,
} = inquiriesApi;
