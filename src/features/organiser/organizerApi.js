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
            query: (id) => `/me/organiser/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventBookings: builder.query({
            query: (eventId) => `/me/organiser/events/${eventId}/bookings?page=0&size=100`,
            providesTags: (result, error, eventId) => [
                'Booking',
                { type: 'Booking', id: `org-${eventId}` },
            ],
            transformResponse: (response) => {
                const d = response?.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),
        getEventAnalytics: builder.query({
            query: (eventId) => `/me/organiser/events/${eventId}/analytics`,
            providesTags: (result, error, eventId) => [
                { type: 'Analytics', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        getManagerEvents: builder.query({
            query: () => '/me/manager/events',
            providesTags: ['Event'],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
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
    useGetManagerEventsQuery,
    useGetWorkspacesQuery,
} = organizerApi;
