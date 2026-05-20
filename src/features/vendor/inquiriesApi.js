import { baseApi } from '@/services/baseApi';

/* ────────────────────────────────────────────────────────────────────────────
   Vendor INQUIRY API slice — the organiser-initiated direction (PRD §3.16
   Flow B). When an organiser opens an inquiry, the backend auto-creates a
   VENDOR_INQUIRY conversation and adds the vendor as a participant. From that
   point on, the inquiry IS the conversation — there's no separate inquiry
   inbox API. Vendors see inquiries via the regular chat list filtered to
   `type === 'VENDOR_INQUIRY'` (see messagesApi.getConversations).

   Previously this slice exposed getEventInquiries / getReceivedInquiries /
   closeInquiry, all of which 404'd. They were never implemented on the
   backend (VendorInquiryController only exposes POST and POST /confirm) and
   are removed here to keep the API surface honest.
   ──────────────────────────────────────────────────────────────────────── */
export const inquiriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /** Organiser/manager opens a direct vendor inquiry — auto-creates a VENDOR_INQUIRY conversation. */
        sendInquiry: builder.mutation({
            query: ({ eventId, vendorId, message, serviceType }) => ({
                url: `/events/${eventId}/vendor-inquiries`,
                method: 'POST',
                body: { vendorId, message, serviceType },
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Inquiry', id: eventId },
                'Conversation',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /**
         * After chat negotiation, organiser formally confirms the vendor for the
         * event — this is what creates the VENDOR EventMembership and opens the
         * contract drafting path.
         */
        confirmInquiry: builder.mutation({
            query: ({ eventId, conversationId }) => ({
                url: `/events/${eventId}/vendor-inquiries/${conversationId}/confirm`,
                method: 'POST',
            }),
            invalidatesTags: ['Conversation', 'Inquiry', 'Contract'],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useSendInquiryMutation,
    useConfirmInquiryMutation,
} = inquiriesApi;
