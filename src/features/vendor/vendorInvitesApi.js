import { baseApi } from '@/services/baseApi';

/* ────────────────────────────────────────────────────────────────────────────
   Vendor invitation flow.

   Organisers create invites scoped to a specific event; the link sends the
   recipient to /vendor/invite/:token where they accept and get a SANDBOXED
   vendor profile tied to that one event. Self-verification lifts the sandbox.
   ───────────────────────────────────────────────────────────────────────── */

const VENDOR_INVITES = 'VendorInvites';

export const vendorInvitesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /** Organiser: create an invite. The raw token comes back ONCE — surface it
         *  to the organiser before they navigate away (use it to build the link). */
        createVendorInvite: builder.mutation({
            query: ({ targetEmail, eventId }) => ({
                url: '/organiser/vendor-invites',
                method: 'POST',
                body: { targetEmail, eventId },
            }),
            invalidatesTags: (result, error, { eventId }) =>
                eventId ? [{ type: VENDOR_INVITES, id: eventId }] : [],
            transformResponse: (response) => response?.data ?? response,
        }),

        /** Organiser: list invites for a given event. Tokens are NOT echoed. */
        getVendorInvitesForEvent: builder.query({
            query: (eventId) => `/organiser/events/${eventId}/vendor-invites`,
            providesTags: (result, error, eventId) => [{ type: VENDOR_INVITES, id: eventId }],
            transformResponse: (response) => response?.data ?? response ?? [],
        }),

        /** Public peek — used by the invite landing page to render the right
         *  context (event title, inviter name) before the recipient accepts. */
        peekVendorInvite: builder.query({
            query: (token) => `/vendor/invite/${token}`,
            transformResponse: (response) => response?.data ?? response,
        }),

        /** Accept an invite. Creates a User if needed, attaches a vendor profile.
         *  For event-scoped invites the profile is SANDBOXED to the event. */
        completeVendorInvite: builder.mutation({
            query: (body) => ({
                url: '/vendor/invite/complete',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['User', 'VendorVerification'],
            transformResponse: (response) => response?.data ?? response,
        }),

        /** Self-verify (simulated ~2s wait on the server). Promotes SANDBOXED →
         *  VERIFIED and clears sandboxEventId. */
        selfVerifyVendor: builder.mutation({
            query: () => ({ url: '/vendor/self-verify', method: 'POST' }),
            invalidatesTags: ['VendorVerification'],
            transformResponse: (response) => response?.data ?? response,
        }),
    }),
});

export const {
    useCreateVendorInviteMutation,
    useGetVendorInvitesForEventQuery,
    usePeekVendorInviteQuery,
    useCompleteVendorInviteMutation,
    useSelfVerifyVendorMutation,
} = vendorInvitesApi;
