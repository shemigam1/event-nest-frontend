import { baseApi } from '@/services/baseApi';

export const programmeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getProgramme: builder.query({
            query: (eventId) => `/events/${eventId}/programme`,
            providesTags: (result, error, eventId) => [{ type: 'Programme', id: eventId }],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),
        addProgrammeItem: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/programme`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Programme', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        updateProgrammeItem: builder.mutation({
            query: ({ eventId, itemId, ...body }) => ({
                url: `/events/${eventId}/programme/${itemId}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Programme', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        deleteProgrammeItem: builder.mutation({
            query: ({ eventId, itemId }) => ({
                url: `/events/${eventId}/programme/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Programme', id: eventId }],
        }),
    }),
});

export const {
    useGetProgrammeQuery,
    useAddProgrammeItemMutation,
    useUpdateProgrammeItemMutation,
    useDeleteProgrammeItemMutation,
} = programmeApi;
