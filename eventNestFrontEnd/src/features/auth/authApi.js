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
    })
});

export const { useLoginMutation, useRegisterMutation, useGetAuthenticatedUserQuery } = authApi;