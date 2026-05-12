import { baseApi } from '@/services/baseApi';

export const bookingsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createBooking: builder.mutation({
            query: ({ eventId, tierId, quantity }) => ({
                url: `/events/${eventId}/bookings`,
                method: 'POST',
                body: { tierId, quantity },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                'Booking',
                'Ticket',
                { type: 'Event', id: eventId },
                { type: 'Event', id: `${eventId}-tiers` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        cancelBooking: builder.mutation({
            query: ({ eventId, bookingId }) => ({
                url: `/events/${eventId}/bookings/${bookingId}/cancel`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                'Booking',
                'Ticket',
                { type: 'Event', id: `${eventId}-tiers` },
            ],
            transformResponse: (response) => response.data ?? response,
        }),
        getMyBookings: builder.query({
            query: () => '/me/bookings',
            providesTags: ['Booking'],
            transformResponse: (response) => response.data ?? response,
        }),
        verifyPayment: builder.mutation({
            query: (transactionReference) => ({
                url: `/payments/monnify/verify/${transactionReference}`,
                method: 'POST',
            }),
            invalidatesTags: ['Booking', 'Ticket'],
            transformResponse: (response) => response.data ?? response,
        }),
    }),
});

export const {
    useCreateBookingMutation,
    useCancelBookingMutation,
    useGetMyBookingsQuery,
    useVerifyPaymentMutation,
} = bookingsApi;
