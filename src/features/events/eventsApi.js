import { baseApi } from '@/services/baseApi';

export const eventsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPublishedEvents: builder.query({
            query: () => '/events',
            providesTags: ['Event'],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventById: builder.query({
            query: (id) => `/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventTiers: builder.query({
            query: (eventId) => `/events/${eventId}/tiers`,
            providesTags: (result, error, eventId) => [{ type: 'Event', id: `${eventId}-tiers` }],
            transformResponse: (response) => response.data ?? response,
        }),
        createEvent: builder.mutation({
            query: (body) => ({ url: '/events', method: 'POST', body }),
            invalidatesTags: ['Event'],
            transformResponse: (response) => response.data ?? response,
        }),
        updateEvent: builder.mutation({
            query: ({ id, ...body }) => ({ url: `/events/${id}`, method: 'PATCH', body }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        submitEvent: builder.mutation({
            query: (id) => ({ url: `/events/${id}/submit`, method: 'PATCH' }),
            invalidatesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        deleteEvent: builder.mutation({
            query: (id) => ({ url: `/events/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Event'],
        }),

        getEventConfig: builder.query({
            query: (eventId) => `/events/${eventId}/config`,
            providesTags: (result, error, eventId) => [{ type: 'EventEdit', id: `config-${eventId}` }],
            transformResponse: (response) => response?.data ?? response,
        }),

        updateEventConfig: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/config`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'EventEdit', id: `config-${eventId}` },
                { type: 'Event', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useGetPublishedEventsQuery,
    useGetEventByIdQuery,
    useGetEventTiersQuery,
    useCreateEventMutation,
    useUpdateEventMutation,
    useSubmitEventMutation,
    useDeleteEventMutation,
    useGetEventConfigQuery,
    useUpdateEventConfigMutation,
} = eventsApi;
