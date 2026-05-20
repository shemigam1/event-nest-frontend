import { baseApi } from '@/services/baseApi';

/**
 * Crowd-funded contribution pools (PRD §3.7). Each published event can have at most
 * one pool; once created, contributors (authenticated or anonymous) can chip in. The
 * organiser view sees the pool summary + full contribution list including private
 * notes — even contributions marked `isAnonymous`, where contributor_id is stored
 * internally for refund traceability but displayed as "Anonymous Guest".
 */
export const contributionsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /** Pool summary — goal, current, progress %, active flag. Public when isPublic=true. */
        getPool: builder.query({
            query: (eventId) => `/events/${eventId}/contributions/pool`,
            providesTags: (result, error, eventId) => [{ type: 'ContributionPool', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser creates the pool (requires EventConfig.contributionsEnabled = true). */
        createPool: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/contributions/pool`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'ContributionPool', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser updates title / goal / visibility / active flag. */
        updatePool: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/contributions/pool`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'ContributionPool', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Organiser-only list of every contribution on the event (paginated). */
        listContributions: builder.query({
            query: ({ eventId, page = 0, size = 20 }) => ({
                url: `/events/${eventId}/contributions`,
                params: { page, size },
            }),
            providesTags: (result, error, { eventId }) => [{ type: 'Contribution', id: eventId }],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                if (d && Array.isArray(d.content)) return d;
                return Array.isArray(d) ? { content: d, totalElements: d.length, number: 0, size: d.length } : d;
            },
        }),

        /** A contribute action — JWT or anonymous. Used by the public widget on the event page. */
        contribute: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/contributions`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'ContributionPool', id: eventId },
                { type: 'Contribution', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useGetPoolQuery,
    useCreatePoolMutation,
    useUpdatePoolMutation,
    useListContributionsQuery,
    useContributeMutation,
} = contributionsApi;
