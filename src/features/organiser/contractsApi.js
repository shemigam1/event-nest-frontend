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
            query: (eventId) => `/events/${eventId}/contracts`,
            providesTags: (result, error, eventId) => [
                { type: 'Contract', id: eventId },
            ],
            transformResponse: (r) => r?.data ?? r ?? [],
        }),

        getMyContracts: builder.query({
            query: () => '/contracts/mine',
            providesTags: ['ContractMine'],
            transformResponse: (r) => r?.data ?? r ?? [],
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
            query: (contractId) => ({
                url: `/contracts/${contractId}/sign`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        activateContract: builder.mutation({
            query: (contractId) => ({
                url: `/contracts/${contractId}/activate`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        completeContract: builder.mutation({
            query: (contractId) => ({
                url: `/contracts/${contractId}/complete`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, contractId) => [
                { type: 'Contract', id: contractId },
                ...(result?.eventId ? [{ type: 'Contract', id: result.eventId }] : []),
                'ContractMine',
            ],
            transformResponse: (r) => r?.data ?? r,
        }),

        terminateContract: builder.mutation({
            query: (contractId) => ({
                url: `/contracts/${contractId}/terminate`,
                method: 'PATCH',
            }),
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
    }),
});

export const {
    useCreateContractMutation,
    useGetEventContractsQuery,
    useGetMyContractsQuery,
    useGetContractQuery,
    useUpdateContractMutation,
    useSignContractMutation,
    useActivateContractMutation,
    useCompleteContractMutation,
    useTerminateContractMutation,
    useFundEscrowMutation,
    useGetEscrowQuery,
    useAddMilestoneMutation,
    useApproveMilestoneMutation,
    useReleaseMilestoneMutation,
} = contractsApi;
