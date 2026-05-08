import { baseApi } from '@/services/baseApi';

export const organizerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOrganizerEvents: builder.query({
            query: () => '/organizer/events',
            providesTags: ['Event'],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventBookings: builder.query({
            query: (eventId) => `/organizer/events/${eventId}/bookings`,
            providesTags: (result, error, eventId) => [{ type: 'Booking', id: `org-${eventId}` }],
            transformResponse: (response) => response.data?.content ?? response.data ?? [],
        }),
    }),
});

export const {
    useGetOrganizerEventsQuery,
    useGetEventBookingsQuery,
} = organizerApi;
