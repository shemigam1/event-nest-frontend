import { baseApi } from '@/services/baseApi';

export const organizerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOrganizerEvents: builder.query({
            query: () => '/organizer/events',
            providesTags: ['Event'],
            transformResponse: (response) => response.data ?? response,
        }),
        getOrganizerEventById: builder.query({
            query: (id) => `/organizer/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventBookings: builder.query({
            // Backend returns a raw List<BookingResponse> (same shape as
            // /me/bookings), not a paged Page wrapper — hence the simple
            // `response ?? []` fallback.
            query: (eventId) => `/organizer/events/${eventId}/bookings`,
            providesTags: (result, error, eventId) => [
                'Booking',
                { type: 'Booking', id: `org-${eventId}` },
            ],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
    }),
});

export const {
    useGetOrganizerEventsQuery,
    useGetOrganizerEventByIdQuery,
    useGetEventBookingsQuery,
} = organizerApi;
