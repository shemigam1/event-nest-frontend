import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '../services/baseApi';
import authReducer, { logout, setCredentials } from '../features/auth/authSlice';
import activityReducer from '../features/activity/activitySlice';

/**
 * Clear every RTK Query cache entry the moment the user logs out.
 * Without this, a second user logging in on the same browser within the
 * 60-second cache TTL would see the previous user's events — and clicking
 * them would 404 because the backend correctly rejects the unauthorised access.
 */
const listenerMiddleware = createListenerMiddleware();
listenerMiddleware.startListening({
    actionCreator: logout,
    effect: (_action, listenerApi) => {
        listenerApi.dispatch(baseApi.util.resetApiState());
    },
});

// Also reset on login so a re-login (e.g. after token expiry for a different
// account) never serves the outgoing user's cached data to the incoming user.
listenerMiddleware.startListening({
    actionCreator: setCredentials,
    effect: (_action, listenerApi) => {
        listenerApi.dispatch(baseApi.util.resetApiState());
    },
});

export const store = configureStore({
    reducer: {
        auth: authReducer,
        activity: activityReducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .prepend(listenerMiddleware.middleware)
            .concat(baseApi.middleware),
});

export default store;
