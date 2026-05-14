import { baseApi } from '@/services/baseApi';

export const messagesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getConversations: builder.query({
            query: () => '/chat/conversations',
            transformResponse: (res) => res.data ?? res,
            providesTags: ['Conversation'],
        }),

        getConversationMessages: builder.query({
            query: ({ conversationId, limit = 20, beforeId }) => {
                const params = new URLSearchParams({ limit });
                if (beforeId) params.set('beforeId', beforeId);
                return `/chat/conversations/${conversationId}/messages?${params}`;
            },
            transformResponse: (res) => res.data ?? res,
            providesTags: (result, error, { conversationId }) => [
                { type: 'ConversationMessages', id: conversationId },
            ],
        }),

        createOrGetConversation: builder.mutation({
            query: (body) => ({
                url: '/chat/conversations',
                method: 'POST',
                body,
            }),
            transformResponse: (res) => res.data ?? res,
            invalidatesTags: ['Conversation'],
        }),

        markConversationRead: builder.mutation({
            query: (conversationId) => ({
                url: `/chat/conversations/${conversationId}/read`,
                method: 'POST',
            }),
            transformResponse: (res) => res?.data ?? res,
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetConversationMessagesQuery,
    useCreateOrGetConversationMutation,
    useMarkConversationReadMutation,
} = messagesApi;
