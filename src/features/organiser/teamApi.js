import { baseApi } from '@/services/baseApi';

export const teamApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getEventManagers: builder.query({
            query: (eventId) => `/organizer/events/${eventId}/managers`,
            providesTags: (result, error, eventId) => [{ type: 'Manager', id: eventId }],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),
        assignManager: builder.mutation({
            query: ({ eventId, email }) => ({
                url: `/organizer/events/${eventId}/managers`,
                method: 'POST',
                body: { email },
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Manager', id: eventId }],
            transformResponse: (r) => r?.data ?? r,
        }),
        removeManager: builder.mutation({
            query: ({ eventId, managerId }) => ({
                url: `/organizer/events/${eventId}/managers/${managerId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'Manager', id: eventId }],
        }),
    }),
});

export const {
    useGetEventManagersQuery,
    useAssignManagerMutation,
    useRemoveManagerMutation,
} = teamApi;
