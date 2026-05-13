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
        // Backs the "Withdraw" action on pending-approval events in
        // My events. Flips status back to DRAFT.
        withdrawEvent: builder.mutation({
            query: (id) => ({ url: `/events/${id}/withdraw`, method: 'POST' }),
            invalidatesTags: (result, error, id) => ['Event', { type: 'Event', id }],
            transformResponse: (response) => response.data ?? response,
        }),
        deleteEvent: builder.mutation({
            query: (id) => ({ url: `/events/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Event'],
        }),
        // Per-event module toggles (programme, ratings, guest-list, ticketing).
        // Backend gates the relevant feature endpoints with these flags, so
        // turning a module off makes its surface return 409.
        getEventConfig: builder.query({
            query: (eventId) => `/events/${eventId}/config`,
            providesTags: (result, error, eventId) => [
                { type: 'Event', id: `${eventId}-config` },
            ],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),
        updateEventConfig: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/config`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Event', id: `${eventId}-config` },
                { type: 'Programme', id: eventId },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),
        // Presign a cover-image upload. Backend generates the S3 key, saves
        // publicUrl on the event immediately, and returns { uploadUrl, publicUrl, contentType }.
        // The caller must then PUT the raw file bytes directly to uploadUrl.
        presignCoverImage: builder.mutation({
            query: ({ eventId, contentType }) => ({
                url: `/events/${eventId}/cover-image/presign?contentType=${encodeURIComponent(contentType)}`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                'Event',
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
    useWithdrawEventMutation,
    useDeleteEventMutation,
    usePresignCoverImageMutation,
    useGetEventConfigQuery,
    useUpdateEventConfigMutation,
} = eventsApi;
