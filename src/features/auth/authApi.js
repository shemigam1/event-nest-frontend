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

        getMe: builder.query({
            query: () => '/me',
            providesTags: ['User'],
            transformResponse: (response) => response?.data ?? response,
        }),

        forgotPassword: builder.mutation({
            query: (body) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
        }),

        resetPassword: builder.mutation({
            query: (body) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
        }),

        validateResetToken: builder.query({
            query: (token) => `/auth/reset-password/validate?token=${token}`,
            transformResponse: (response) => response?.data ?? response,
        }),

        updateProfile: builder.mutation({
            query: (body) => ({
                url: '/me',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['User'],
            transformResponse: (response) => response?.data ?? response,
        }),

        changePassword: builder.mutation({
            query: (body) => ({
                url: '/me/password',
                method: 'PATCH',
                body,
            }),
            transformResponse: (response) => response?.data ?? response,
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
