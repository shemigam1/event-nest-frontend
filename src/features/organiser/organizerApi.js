import { baseApi } from '@/services/baseApi';

export const organizerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOrganizerEvents: builder.query({
            query: () => '/me/organiser/events',
            providesTags: ['Event'],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
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

        getEventAnalytics: builder.query({
            query: (eventId) => `/organizer/events/${eventId}/analytics`,
            providesTags: (result, error, eventId) => [
                { type: 'Analytics', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        getWorkspaces: builder.query({
            query: () => '/me/workspaces',
            providesTags: ['User'],
            transformResponse: (response) => {
                const d = response?.data ?? response;
                return Array.isArray(d) ? d : (d ? Object.values(d) : []);
            },
        }),
    }),
});

export const {
    useGetOrganizerEventsQuery,
    useGetOrganizerEventByIdQuery,
    useGetEventBookingsQuery,
    useGetEventAnalyticsQuery,
    useGetWorkspacesQuery,
} = organizerApi;
