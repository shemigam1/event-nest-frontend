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
            query: ({ token, password }) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: { token, newPassword: password },
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
        getMe: builder.query({
            query: () => '/me',
            transformResponse: (response) => response.data ?? response,
            providesTags: ['Me'],
        }),
        updateProfile: builder.mutation({
            query: (body) => ({
                url: '/me',
                method: 'PATCH',
                body,
            }),
            transformResponse: (response) => response.data ?? response,
            invalidatesTags: ['Me'],
        }),
        changePassword: builder.mutation({
            query: (body) => ({
                url: '/me/change-password',
                method: 'POST',
                body,
            }),
            transformResponse: (response) => response.data ?? response,
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
    useGetMeQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
} = authApi;
