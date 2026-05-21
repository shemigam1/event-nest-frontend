import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            headers.set('Content-Type', 'application/json');

            return headers;
        },
    }),
    tagTypes: [
        'User', 'Event', 'Booking', 'Ticket', 'Transfer', 'Analytics', 'Notification',
        'CheckInInvite', 'EventEdit', 'Comment', 'Conversation', 'ConversationMessages',
        'Guest', 'Manager', 'Budget', 'Programme', 'Contract', 'Escrow',
        'VendorApplication', 'VendorApplicationMine', 'VendorVerification',
        'InquiryReceived', 'Inquiry', 'ContractMine',
        'ContributionPool', 'Contribution',
        'RatingForm', 'RatingResponses',
    ],
    endpoints: () => ({}),
});
