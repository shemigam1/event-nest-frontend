import { baseApi } from '@/services/baseApi';

/* ─────────────────────────────────────────────────────────────────────────
   Host profiles — a user's business identities used to host public events.
   Distinct from VendorProfile (one per user, marketplace listing for service
   providers); a user can have many host profiles, one per business.
   Creation is gated on KYC = VERIFIED.
   ───────────────────────────────────────────────────────────────────────── */
export const hostProfilesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyHostProfiles: builder.query({
            query: () => '/me/host-profiles',
            providesTags: (result) =>
                result
                    ? [
                          ...result.map((p) => ({ type: 'HostProfile', id: p.id })),
                          { type: 'HostProfile', id: 'LIST' },
                      ]
                    : [{ type: 'HostProfile', id: 'LIST' }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        getHostProfile: builder.query({
            query: (id) => `/me/host-profiles/${id}`,
            providesTags: (result, error, id) => [{ type: 'HostProfile', id }],
            transformResponse: (response) => response?.data ?? response,
        }),

        createHostProfile: builder.mutation({
            query: (body) => ({
                url: '/me/host-profiles',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'HostProfile', id: 'LIST' }],
            transformResponse: (response) => response?.data ?? response,
        }),

        updateHostProfile: builder.mutation({
            // PATCH semantics: null = unchanged; "" = clear an optional field.
            query: ({ id, ...body }) => ({
                url: `/me/host-profiles/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'HostProfile', id },
                { type: 'HostProfile', id: 'LIST' },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        deleteHostProfile: builder.mutation({
            query: (id) => ({
                url: `/me/host-profiles/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'HostProfile', id },
                { type: 'HostProfile', id: 'LIST' },
            ],
            transformResponse: (response) => response?.data ?? response,
        }),

        presignHostProfileLogo: builder.mutation({
            // Returns { uploadUrl, publicUrl }. Caller PUTs the file body to
            // uploadUrl; publicUrl is the final URL written onto the profile
            // (server pre-writes it so no confirm step is needed).
            query: ({ id, mimeType }) => ({
                url: `/me/host-profiles/${id}/logo/presign`,
                method: 'POST',
                body: { mimeType },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'HostProfile', id }],
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useGetMyHostProfilesQuery,
    useGetHostProfileQuery,
    useCreateHostProfileMutation,
    useUpdateHostProfileMutation,
    useDeleteHostProfileMutation,
    usePresignHostProfileLogoMutation,
} = hostProfilesApi;
