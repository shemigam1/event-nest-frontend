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
        getEventAnalytics: builder.query({
            // Backs the Live dashboard tiles + per-tier bars + daily
            // bookings chart on the event manage page.
            query: (eventId) => `/organizer/events/${eventId}/analytics`,
            providesTags: (result, error, eventId) => [
                { type: 'Event', id: `${eventId}-analytics` },
                'Booking',
            ],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),
        // Managers — backed by ManagerController via OrganizerController routes.
        // A manager has read/write access to the event but cannot delete or
        // transfer ownership. Backend resolves the assignee by email.
        getEventManagers: builder.query({
            query: (eventId) => `/organizer/events/${eventId}/managers`,
            providesTags: (result, error, eventId) => [
                { type: 'Manager', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),
        assignManager: builder.mutation({
            query: ({ eventId, email }) => ({
                url: `/organizer/events/${eventId}/managers`,
                method: 'POST',
                body: { email },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Manager', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        removeManager: builder.mutation({
            query: ({ eventId, managerId }) => ({
                url: `/organizer/events/${eventId}/managers/${managerId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Manager', id: eventId },
            ],
        }),
    }),
});

export const {
    useGetOrganizerEventsQuery,
    useGetOrganizerEventByIdQuery,
    useGetEventBookingsQuery,
    useGetEventAnalyticsQuery,
    useGetEventManagersQuery,
    useAssignManagerMutation,
    useRemoveManagerMutation,
} = organizerApi;
