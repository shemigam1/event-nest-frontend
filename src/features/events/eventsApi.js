import { baseApi } from '@/services/baseApi';

export const eventsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPublishedEvents: builder.query({
            query: (params) => {
                const qs = new URLSearchParams();
                if (params?.sort) qs.set('sort', params.sort);
                if (params?.neighbourhood) qs.set('neighbourhood', params.neighbourhood);
                if (params?.category) qs.set('category', params.category);
                const tail = qs.toString();
                return tail ? `/events?${tail}` : '/events';
            },
            providesTags: ['Event'],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),
        getEventById: builder.query({
            query: (id) => `/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventBySlug: builder.query({
            query: (slug) => `/events/slug/${slug}`,
            providesTags: (result, error, slug) => [{ type: 'Event', id: `slug-${slug}` }],
            transformResponse: (response) => response.data ?? response,
        }),
        getEventTiers: builder.query({
            query: (eventId) => `/events/${eventId}/tiers`,
            providesTags: (result, error, eventId) => [{ type: 'Event', id: `${eventId}-tiers` }],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
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
            // Backend EventController.submitForApproval is @PostMapping, not PATCH.
            query: (id) => ({ url: `/events/${id}/submit`, method: 'POST' }),
            invalidatesTags: (result, error, id) => [{ type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        presignCoverImage: builder.mutation({
            query: ({ eventId, contentType }) => ({
                url: `/events/${eventId}/cover-image/presign`,
                method: 'POST',
                // Backend PresignCoverRequest expects `mimeType`, not `contentType`.
                body: { mimeType: contentType },
            }),
            transformResponse: (response) => response?.data ?? response,
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
    useGetEventBySlugQuery,
    useGetEventTiersQuery,
    useCreateEventMutation,
    useUpdateEventMutation,
    useSubmitEventMutation,
    useDeleteEventMutation,
    useGetEventConfigQuery,
    useUpdateEventConfigMutation,
    usePresignCoverImageMutation,
} = eventsApi;
