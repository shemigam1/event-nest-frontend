import { baseApi } from '@/services/baseApi';

/* ────────────────────────────────────────────────────────────────────────────
   Vendor profile, marketplace, verification, and application API.

   Two flows coexist (PRD §3.16 — "Flow A" + "Flow B"):
    - Vendor-initiated APPLICATION (this file): `applyAsVendor`, accept/reject,
      `getMyVendorApplications`, etc. Backed by VendorApplicationController.
    - Organiser-initiated INQUIRY (inquiriesApi.js): `sendInquiry`,
      `confirmInquiry`. Backed by VendorInquiryController.

   Profile + verification (formerly aimed at `/vendor-verification/*`, which
   doesn't exist on the backend) now points at the real endpoints exposed by
   VendorController (Phase 7): `/vendor/profile` and `/vendor/verification`.
   Schema is businessName + category + bio + portfolioImages + serviceAreas
   + baseRate. Status enum: PENDING / ACTIVE / VERIFIED / SUSPENDED.

   The legacy hook names `useGetMyVendorVerificationQuery` and
   `useApplyForVerificationMutation` are kept as aliases of the new hooks so
   pages that still import the old names keep compiling while we migrate.
   ──────────────────────────────────────────────────────────────────────── */
export const vendorsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // ── Public marketplace ───────────────────────────────────────────────
        getVendors: builder.query({
            query: ({ category, city, minTrustScore, maxBaseRate, sort, page, size, serviceType } = {}) => ({
                url: '/vendors',
                params: {
                    // VendorController.searchMarketplace accepts: category (enum), city (service area),
                    // minTrustScore, maxBaseRate, sort, page, size.
                    ...(category      ? { category }      : {}),
                    ...(city          ? { city }          : {}),
                    ...(minTrustScore ? { minTrustScore } : {}),
                    ...(maxBaseRate   ? { maxBaseRate }   : {}),
                    ...(sort          ? { sort }          : {}),
                    ...(page != null  ? { page }          : {}),
                    ...(size != null  ? { size }          : {}),
                    // serviceType is the legacy frontend filter — passed through if a caller still
                    // uses it. Backend ignores unknown query params.
                    ...(serviceType   ? { serviceType }   : {}),
                },
            }),
            providesTags: ['Vendor'],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                // Backend returns Page<PublicVendorResponse>; preserve shape for paginating
                // pages but also pass through a bare array when one is given for back-compat.
                if (d && Array.isArray(d.content)) return d;
                if (Array.isArray(d)) return d;
                return d;
            },
        }),

        // ── Caller's own vendor profile (self-service) ───────────────────────
        getMyVendorProfile: builder.query({
            query: () => '/vendor/profile',
            providesTags: ['VendorVerification'],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Self-register as a vendor. Status starts at PENDING. */
        createMyVendorProfile: builder.mutation({
            query: (body) => ({
                url: '/vendor/profile',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['VendorVerification', 'Vendor'],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Update own profile (bio, portfolio, service areas, base rate, etc.). */
        updateMyVendorProfile: builder.mutation({
            query: (body) => ({
                url: '/vendor/profile',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['VendorVerification', 'Vendor'],
            transformResponse: (r) => r?.data ?? r,
        }),

        /** Submit verification docs — sets verificationSubmittedAt for admin review. */
        submitVerification: builder.mutation({
            query: (body) => ({
                url: '/vendor/verification',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['VendorVerification'],
            transformResponse: (r) => r?.data ?? r,
        }),

        // ── Public single-vendor profile by id ───────────────────────────────
        getVendorProfile: builder.query({
            query: (vendorId) => `/vendors/${vendorId}`,
            providesTags: (result, error, vendorId) => [{ type: 'Vendor', id: vendorId }],
            transformResponse: (r) => r?.data ?? r,
        }),

        // ── Vendor APPLICATION flow (vendor-initiated) ───────────────────────
        getEventVendorApplications: builder.query({
            query: ({ eventId, status } = {}) => ({
                url: `/events/${eventId}/vendor-applications`,
                params: status ? { status } : undefined,
            }),
            providesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => { const d = r?.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        acceptVendorApplication: builder.mutation({
            query: ({ eventId, applicationId }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/accept`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        rejectVendorApplication: builder.mutation({
            query: ({ eventId, applicationId, reason }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/reject`,
                method: 'POST',
                body: reason ? { reason } : undefined,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        getMyVendorApplications: builder.query({
            query: () => '/me/vendor-applications',
            providesTags: ['VendorApplicationMine'],
            transformResponse: (r) => { const d = r?.data ?? r; return Array.isArray(d) ? d : (d?.content ?? []); },
        }),

        applyAsVendor: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/vendor-applications`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['VendorApplicationMine'],
            transformResponse: (r) => r?.data ?? r,
        }),

        // TODO(Phase E): no backend endpoint at /vendor-applications/{id}/rate. The real
        // organiser-rates-vendor flow lives at POST /events/{eventId}/vendors/{vendorId}/review
        // (VendorReview, fires POSITIVE_RATING trust event ≥4 stars). Kept here so
        // VendorsTab still compiles; runtime calls will 404 until rewired in Phase E.
        rateVendor: builder.mutation({
            query: ({ eventId, applicationId, score, comment }) => ({
                url: `/events/${eventId}/vendor-applications/${applicationId}/rate`,
                method: 'POST',
                body: { score, comment },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'VendorApplication', id: eventId },
                'Vendor',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    // Marketplace
    useGetVendorsQuery,
    useGetVendorProfileQuery,
    // Own profile + verification (new names)
    useGetMyVendorProfileQuery,
    useCreateMyVendorProfileMutation,
    useUpdateMyVendorProfileMutation,
    useSubmitVerificationMutation,
    // Vendor-initiated application flow
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useGetMyVendorApplicationsQuery,
    useApplyAsVendorMutation,
    useRateVendorMutation,
} = vendorsApi;

// Legacy aliases — pages that still import the old hook names continue to work
// against the new endpoints. Response shape is now the full VendorProfileResponse.
export const useGetMyVendorVerificationQuery = useGetMyVendorProfileQuery;
export const useApplyForVerificationMutation = useSubmitVerificationMutation;
