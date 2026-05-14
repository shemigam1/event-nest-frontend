import { baseApi } from "../../services/baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            transformResponse: (response) => response.data,
        }),
        register: builder.mutation({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
            transformResponse: (response) => response.data,
        }),
        refresh: builder.mutation({
            query: (refreshToken) => ({
                url: '/auth/refresh',
                method: 'POST',
                headers: { 'Refresh-Token': refreshToken },
            }),
            transformResponse: (response) => response.data,
        }),
        forgotPassword: builder.mutation({
            query: (email) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body: { email },
            }),
            transformResponse: (response) => response.data,
        }),
        resetPassword: builder.mutation({
            query: ({ token, password, confirmPassword }) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: { token, password, confirmPassword },
            }),
            transformResponse: (response) => response.data,
        }),
        validateResetToken: builder.query({
            query: (token) => ({
                url: '/auth/reset-password/validate',
                params: { token },
            }),
            transformResponse: (response) => response.data,
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useRefreshMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useValidateResetTokenQuery,
} = authApi;
