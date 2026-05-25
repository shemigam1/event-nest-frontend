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
            // Accepts either a bare eventId (legacy: returns flat array of bookings)
            // or { eventId, page, size, paginated } to drill into the paginated
            // shape directly (used by the Payments transactions page).
            query: (arg) => {
                if (typeof arg === 'string') {
                    return `/me/organiser/events/${arg}/bookings?page=0&size=100`;
                }
                const { eventId, page = 0, size = 20 } = arg ?? {};
                return `/me/organiser/events/${eventId}/bookings?page=${page}&size=${size}`;
            },
            providesTags: (result, error, arg) => {
                const eventId = typeof arg === 'string' ? arg : arg?.eventId;
                return ['Booking', { type: 'Booking', id: `org-${eventId}` }];
            },
            transformResponse: (response, _meta, arg) => {
                const d = response?.data ?? response;
                // If the caller asked for the paginated shape, return the whole
                // page object so they can read totalElements / totalPages.
                if (typeof arg !== 'string' && arg?.paginated) {
                    return Array.isArray(d) ? { content: d, totalElements: d.length, totalPages: 1, number: 0 } : d;
                }
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
