import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSse } from './sseClient';

/**
 * Opens the SSE stream when the user is authenticated and closes it
 * when they log out. Reconnects automatically when the JWT changes
 * (e.g. after a token refresh).
 *
 * Mount this exactly once near the root of the app — it's a singleton
 * connection per user session.
 */
export function useSseConnection() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
    const token = useSelector((s) => s.auth.token);

    useEffect(() => {
        if (!isAuthenticated || !token) return undefined;

        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const close = connectSse({ baseUrl, token, dispatch });
        return close;
    }, [isAuthenticated, token, dispatch]);
}
