import { baseApi } from '@/services/baseApi';

/**
 * Post-event rating forms (PRD §3.10). The organiser designs a form with custom
 * questions (STAR / NPS / TEXT / MULTIPLE_CHOICE) and `isOpen` toggles whether
 * attendees may currently submit. The same GET endpoint serves both organisers
 * (with aggregate response counts + averages) and attendees (form structure only).
 */
export const ratingFormsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /** Get the form for an event. Returns 404 when no form exists yet. */
        getRatingForm: builder.query({
            query: (eventId) => `/events/${eventId}/rating-forms`,
            providesTags: (result, error, eventId) => [{ type: 'RatingForm', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser creates the form (title + questions). */
        createRatingForm: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/rating-forms`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'RatingForm', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser updates title / description / isOpen. Questions are immutable post-creation. */
        updateRatingForm: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/rating-forms`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'RatingForm', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Attendee submits answers. Server enforces one submission per attendee per form. */
        submitRatingForm: builder.mutation({
            query: ({ eventId, answers }) => ({
                url: `/events/${eventId}/rating-forms/submit`,
                method: 'POST',
                body: { answers },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'RatingForm', id: eventId },
                { type: 'RatingResponses', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser-only paginated list of every submitted response. */
        listRatingResponses: builder.query({
            query: ({ eventId, page = 0, size = 20 }) => ({
                url: `/events/${eventId}/rating-forms/responses`,
                params: { page, size },
            }),
            providesTags: (result, error, { eventId }) => [
                { type: 'RatingResponses', id: eventId },
            ],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                if (d && Array.isArray(d.content)) return d;
                return Array.isArray(d) ? { content: d, totalElements: d.length, number: 0, size: d.length } : d;
            },
        }),
    }),
});

export const {
    useGetRatingFormQuery,
    useCreateRatingFormMutation,
    useUpdateRatingFormMutation,
    useSubmitRatingFormMutation,
    useListRatingResponsesQuery,
} = ratingFormsApi;
