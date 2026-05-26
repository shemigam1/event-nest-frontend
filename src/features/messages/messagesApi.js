import { baseApi } from '@/services/baseApi';

export const messagesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getConversations: builder.query({
            query: ({ page = 0, size = 20 } = {}) => `/conversations?page=${page}&size=${size}`,
            transformResponse: (res) => {
                const d = res?.data ?? res;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
            providesTags: ['Conversation'],
        }),

        getConversationMessages: builder.query({
            query: ({ conversationId, page = 0, size = 30 }) =>
                `/conversations/${conversationId}/messages?page=${page}&size=${size}`,
            transformResponse: (res) => {
                const d = res?.data ?? res;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
            providesTags: (result, error, { conversationId }) => [
                { type: 'ConversationMessages', id: conversationId },
            ],
        }),

        markConversationRead: builder.mutation({
            query: (conversationId) => ({
                url: `/conversations/${conversationId}/read`,
                method: 'POST',
            }),
            transformResponse: (res) => res?.data ?? res,
            invalidatesTags: ['Conversation'],
        }),

        /**
         * Open (or fetch the existing) event-wide broadcast channel.
         * Idempotent — repeated calls for the same eventId return the same
         * conversation, so the UI can safely call this on every "Broadcast"
         * button click without worrying about creating duplicates.
         */
        openEventBroadcast: builder.mutation({
            query: (eventId) => ({
                url: `/events/${eventId}/broadcast`,
                method: 'POST',
            }),
            transformResponse: (res) => res?.data ?? res,
            invalidatesTags: ['Conversation'],
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetConversationMessagesQuery,
    useMarkConversationReadMutation,
    useOpenEventBroadcastMutation,
} = messagesApi;
