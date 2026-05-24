import { baseApi } from '@/services/baseApi';

/* Social comments + reactions. Backend: CommentController.
   Gated by EventConfig.commentsEnabled — defaults to true. When off,
   reads return 409 with "comments are not enabled for this event". */
export const commentsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /* Top-level comments for an event. Paged, newest first.
           Returned shape: { content, page, size, totalElements, totalPages }. */
        getEventComments: builder.query({
            query: ({ eventId, page = 0, size = 20 }) =>
                `/events/${eventId}/comments?page=${page}&size=${size}`,
            providesTags: (result, error, { eventId }) => [
                { type: 'Comment', id: `event-${eventId}` },
            ],
            transformResponse: (response) => response?.data ?? response ?? null,
        }),

        /* Replies under one parent comment. Oldest first.
           Returned shape: raw List<CommentResponse>. */
        getCommentReplies: builder.query({
            query: (commentId) => `/comments/${commentId}/replies`,
            providesTags: (result, error, commentId) => [
                { type: 'Comment', id: `replies-${commentId}` },
            ],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        createComment: builder.mutation({
            query: ({ eventId, body, parentId }) => ({
                url: `/events/${eventId}/comments`,
                method: 'POST',
                body: { body, parentCommentId: parentId },
            }),
            invalidatesTags: (result, error, { eventId, parentId }) => {
                const tags = [{ type: 'Comment', id: `event-${eventId}` }];
                if (parentId) tags.push({ type: 'Comment', id: `replies-${parentId}` });
                return tags;
            },
            transformResponse: (response) => response?.data ?? response,
        }),

        updateComment: builder.mutation({
            query: ({ commentId, body }) => ({
                url: `/comments/${commentId}`,
                method: 'PATCH',
                body: { body },
            }),
            // Invalidate broadly — we don't know the event or parent here
            // without an extra read, and refetching the visible list is
            // cheap enough.
            invalidatesTags: [{ type: 'Comment' }],
            transformResponse: (response) => response?.data ?? response,
        }),

        deleteComment: builder.mutation({
            query: (commentId) => ({
                url: `/comments/${commentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Comment' }],
        }),

        /* Toggles a LIKE on/off — idempotent. Optimistic update flips
           currentUserLiked + adjusts likeCount on the matching item in
           every cached query that contains this comment, so the UI is
           instant. Falls back to a refetch on error. */
        getUnseenCommentCount: builder.query({
            query: (eventId) => `/events/${eventId}/comments/unseen-count`,
            providesTags: (result, error, eventId) => [{ type: 'CommentUnseen', id: eventId }],
            transformResponse: (r) => r?.data ?? 0,
        }),

        markCommentsSeen: builder.mutation({
            query: (eventId) => ({ url: `/events/${eventId}/comments/mark-seen`, method: 'POST' }),
            invalidatesTags: (result, error, eventId) => [{ type: 'CommentUnseen', id: eventId }],
        }),

        toggleCommentLike: builder.mutation({
            query: (commentId) => ({
                url: `/comments/${commentId}/like`,
                method: 'POST',
            }),
            transformResponse: (response) => response?.data ?? response,
            async onQueryStarted(commentId, { dispatch, getState, queryFulfilled }) {
                const flip = (c) => {
                    if (!c || c.id !== commentId) return c;
                    const now = !c.currentUserLiked;
                    return {
                        ...c,
                        currentUserLiked: now,
                        likeCount: Math.max(0, (c.likeCount ?? 0) + (now ? 1 : -1)),
                    };
                };

                const patches = [];
                const entries = commentsApi.util
                    .selectInvalidatedBy(getState(), [{ type: 'Comment' }]);

                for (const { endpointName, originalArgs } of entries) {
                    if (endpointName === 'getEventComments') {
                        patches.push(dispatch(
                            commentsApi.util.updateQueryData('getEventComments', originalArgs, (draft) => {
                                if (!draft?.content) return;
                                draft.content = draft.content.map(flip);
                            }),
                        ));
                    } else if (endpointName === 'getCommentReplies') {
                        patches.push(dispatch(
                            commentsApi.util.updateQueryData('getCommentReplies', originalArgs, (draft) => {
                                if (!Array.isArray(draft)) return;
                                for (let i = 0; i < draft.length; i++) {
                                    draft[i] = flip(draft[i]);
                                }
                            }),
                        ));
                    }
                }

                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p.undo());
                }
            },
        }),
    }),
});

export const {
    useGetEventCommentsQuery,
    useGetCommentRepliesQuery,
    useCreateCommentMutation,
    useUpdateCommentMutation,
    useDeleteCommentMutation,
    useToggleCommentLikeMutation,
    useGetUnseenCommentCountQuery,
    useMarkCommentsSeenMutation,
} = commentsApi;
