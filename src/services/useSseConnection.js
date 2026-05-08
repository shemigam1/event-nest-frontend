import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSse } from './sseClient';
import { addActivity } from '@/features/activity/activitySlice';

/**
 * Opens the SSE stream when the user is authenticated and closes it
 * when they log out. Reconnects automatically when the JWT changes
 * (e.g. after a token refresh).
 *
 * Each incoming event has two side-effects:
 *   1. RTK Query tag invalidation (handled inside connectSse) — refreshes
 *      cached views like /me/bookings, /me/tickets, /events/{id}.
 *   2. A push into the activity slice — drives the live feed widget on
 *      the organiser console.
 *
 * Mount exactly once near the root of the app.
 */
export function useSseConnection() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
    const token = useSelector((s) => s.auth.token);

    useEffect(() => {
        if (!isAuthenticated || !token) return undefined;

        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const close = connectSse({
            baseUrl,
            token,
            dispatch,
            onEvent: (type, payload) => {
                dispatch(addActivity({ type, payload }));
            },
        });
        return close;
    }, [isAuthenticated, token, dispatch]);
}
