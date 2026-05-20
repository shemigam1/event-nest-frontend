import { baseApi } from '@/services/baseApi';

export const notificationsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyNotifications: builder.query({
            query: ({ page = 0, size = 20 } = {}) =>
                `/me/notifications?page=${page}&size=${size}`,
            providesTags: ['Notification'],
            transformResponse: (response) => {
                const d = response.data ?? response;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),
        getUnreadNotificationCount: builder.query({
            query: () => '/me/notifications/unread-count',
            providesTags: ['Notification'],
            transformResponse: (response) => {
                if (typeof response === 'number') return response;
                return Number(response?.data ?? response ?? 0) || 0;
            },
        }),
        markNotificationAsRead: builder.mutation({
            query: (id) => ({
                url: `/me/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
            transformResponse: (response) => response.data ?? response,
        }),
    }),
});

export const {
    useGetMyNotificationsQuery,
    useGetUnreadNotificationCountQuery,
    useMarkNotificationAsReadMutation,
} = notificationsApi;
