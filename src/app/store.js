import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../services/baseApi';
import authReducer from '../features/auth/authSlice';
import activityReducer from '../features/activity/activitySlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        activity: activityReducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
});

export default store;
