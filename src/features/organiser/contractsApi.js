import { baseApi } from '@/services/baseApi';

export const contractsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /* ── Contracts ────────────────────────────────────────────────── */

        createContract: builder.mutation({
            query: ({ eventId, ...body }) => ({
                url: `/events/${eventId}/contracts`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { eventId }) => [
                { type: 'Contract', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        getEventContracts: builder.query({
            query: (eventId) => `/organiser/events/${eventId}/contracts`,
            providesTags: (result, error, eventId) => [
                { type: 'Contract', id: eventId },
            ],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                return Array.isArray(d) ? d : (d?.content ?? []);
            },
        }),

        getVendorContracts: builder.query({
            query: () => '/contracts/mine',
            providesTags: ['ContractMine'],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                const items = Array.isArray(d) ? d : (d?.content ?? []);
                return items.map(c => ({
                    ...c,
                    id:           c.id           ?? c.contractId,
                    status:       c.status       ?? c.contractStatus,
                    amount:       c.amount       ?? c.totalValue,
                    eventName:    c.eventName    ?? c.eventTitle,
                    organiserName: c.organiserName,
                    milestones:   c.milestones   ?? [],
                }));
            },
        }),

        getMyContracts: builder.query({
            query: () => '/me/organiser/contracts',
            providesTags: ['ContractMine'],
            transformResponse: (r) => {
                const d = r?.data ?? r;
                const items = Array.isArray(d) ? d : (d?.content ?? []);
                // Normalize ContractSummaryResponse field names to what the UI expects
                return items.map(c => ({
                    ...c,
                    amount:     c.amount     ?? c.totalValue,
                    vendorName: c.vendorName ?? c.vendorBusinessName,
                    eventName:  c.eventName  ?? c.eventTitle,
                }));
            },
        }),

        getContract: builder.query({
            query: (contractId) => `/contracts/${contractId}`,
            providesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        updateContract: builder.mutation({
            query: ({ contractId, ...body }) => ({
                url: `/contracts/${contractId}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (result, error, { contractId }) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        signContract: builder.mutation({
            query: ({ contractId, signatureIntent = 'I agree to the terms of this contract.' }) => ({
                url: `/contracts/${contractId}/sign`,
                method: 'POST',
                body: { signatureIntent },
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        rescindContract: builder.mutation({
            query: (contractId) => ({
                url: `/contracts/${contractId}/rescind`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        cancelContract: builder.mutation({
            query: (arg) => {
                const contractId = typeof arg === 'object' ? arg.contractId : arg;
                const reason = (typeof arg === 'object' && arg.reason) ? arg.reason : 'Cancelled by organiser';
                return {
                    url: `/contracts/${contractId}/cancel`,
                    method: 'POST',
                    body: { reason },
                };
            },
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        /* ── Escrow ───────────────────────────────────────────────────── */

        fundEscrow: builder.mutation({
            query: (contractId) => ({
                url: `/contracts/${contractId}/escrow/fund`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Escrow', id: contractId },
                { type: 'Contract', id: contractId },
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        getEscrow: builder.query({
            query: (contractId) => `/contracts/${contractId}/escrow`,
            providesTags: (result, error, contractId) => [
                { type: 'Escrow', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        addMilestone: builder.mutation({
            query: ({ contractId, ...body }) => ({
                url: `/contracts/${contractId}/escrow/milestones`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { contractId }) => [
                { type: 'Escrow', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        approveMilestone: builder.mutation({
            query: ({ contractId, milestoneId }) => ({
                url: `/contracts/${contractId}/escrow/milestones/${milestoneId}/approve`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, { contractId }) => [
                { type: 'Escrow', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        releaseMilestone: builder.mutation({
            query: ({ contractId, milestoneId }) => ({
                url: `/contracts/${contractId}/escrow/milestones/${milestoneId}/release`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, { contractId }) => [
                { type: 'Escrow', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        disputeMilestone: builder.mutation({
            query: ({ contractId, milestoneId, reason }) => ({
                url: `/contracts/${contractId}/escrow/milestones/${milestoneId}/dispute`,
                method: 'POST',
                body: { reason },
            }),
            invalidatesTags: (result, error, { contractId }) => [
                { type: 'Escrow', id: contractId },
            ],
            transformResponse: (r) => r?.data ?? r,
        }),
    }),
});

export const {
    useGetVendorContractsQuery,
    useCreateContractMutation,
    useGetEventContractsQuery,
    useGetMyContractsQuery,
    useGetContractQuery,
    useUpdateContractMutation,
    useSignContractMutation,
    useRescindContractMutation,
    useCancelContractMutation,
    useFundEscrowMutation,
    useGetEscrowQuery,
    useAddMilestoneMutation,
    useApproveMilestoneMutation,
    useReleaseMilestoneMutation,
    useDisputeMilestoneMutation,
} = contractsApi;
