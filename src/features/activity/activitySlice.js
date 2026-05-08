import { createSlice } from '@reduxjs/toolkit';

/**
 * Ring buffer of recent SSE events, used to drive the live activity feed
 * on the organiser console. We only keep the last N because the feed is
 * an at-a-glance view, not a permanent log — the audit row in the
 * `notifications` table on the backend is the durable record.
 */
const MAX_ITEMS = 30;
let nextLocalId = 1;

const slice = createSlice({
    name: 'activity',
    initialState: { items: [] },
    reducers: {
        addActivity: {
            reducer: (state, action) => {
                state.items.unshift(action.payload);
                if (state.items.length > MAX_ITEMS) {
                    state.items.length = MAX_ITEMS;
                }
            },
            prepare: ({ type, payload }) => ({
                payload: {
                    id: nextLocalId++,
                    type,
                    payload: payload ?? null,
                    receivedAt: Date.now(),
                },
            }),
        },
        clearActivity: (state) => {
            state.items = [];
        },
    },
});

export const { addActivity, clearActivity } = slice.actions;

export const selectAllActivity = (state) => state.activity.items;

/** Items whose payload.eventId matches the given event UUID. */
export const selectActivityForEvent = (eventId) => (state) =>
    state.activity.items.filter((item) => item.payload?.eventId === eventId);

export default slice.reducer;
