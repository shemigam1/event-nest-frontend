import { baseApi } from "../../services/baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        register: builder.mutation({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
        }),
        getAuthenticatedUser: builder.query({
            query: () => '/auth/me',
            providesTags: ['User'],
        }),
        socialAuth: builder.mutation({
            query: (payload) => ({
                url: '/social-auth/',
                method: 'POST',
                body: payload,
            }),
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useGetAuthenticatedUserQuery,
    useSocialAuthMutation,
} = authApi;
