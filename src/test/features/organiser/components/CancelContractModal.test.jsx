import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import CancelContractModal from '@/features/organiser/components/CancelContractModal';

const BASE_URL = 'http://localhost:3000';
const CONTRACT_ID = 'ctr_abc_123';
const CONTRACT_TITLE = 'Please Help Out';

function renderModal(overrides = {}) {
    const onDismiss = vi.fn();
    const onCancelled = vi.fn();
    const utils = renderWithProviders(
        <CancelContractModal
            contractId={CONTRACT_ID}
            contractTitle={CONTRACT_TITLE}
            onDismiss={onDismiss}
            onCancelled={onCancelled}
            {...overrides}
        />,
    );
    return { ...utils, onDismiss, onCancelled };
}

describe('CancelContractModal', () => {
    test('renders the contract title in the body', () => {
        renderModal();
        expect(screen.getByText(CONTRACT_TITLE)).toBeInTheDocument();
        // Heading is the question form, not the title
        expect(screen.getByRole('heading', { name: /cancel this contract\?/i })).toBeInTheDocument();
    });

    test('Cancel contract button is disabled when reason is empty', () => {
        renderModal();
        const confirm = screen.getByRole('button', { name: /cancel contract/i });
        expect(confirm).toBeDisabled();
    });

    test('Cancel contract button enables once the reason has content', async () => {
        renderModal();
        const textarea = screen.getByLabelText(/reason/i);
        await userEvent.type(textarea, 'Vendor unavailable for the date');
        expect(screen.getByRole('button', { name: /cancel contract/i })).toBeEnabled();
    });

    test('whitespace-only reason does not enable submit', async () => {
        renderModal();
        const textarea = screen.getByLabelText(/reason/i);
        await userEvent.type(textarea, '     ');
        expect(screen.getByRole('button', { name: /cancel contract/i })).toBeDisabled();
    });

    test('Keep contract button calls onDismiss without firing the request', async () => {
        const seen = vi.fn();
        server.use(
            http.post(`${BASE_URL}/contracts/:id/cancel`, () => {
                seen();
                return HttpResponse.json({ success: true, data: {} });
            }),
        );
        const { onDismiss } = renderModal();
        await userEvent.click(screen.getByRole('button', { name: /keep contract/i }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(seen).not.toHaveBeenCalled();
    });

    test('submitting fires POST /contracts/:id/cancel with the reason and closes on success', async () => {
        let capturedBody = null;
        let capturedParams = null;
        server.use(
            http.post(`${BASE_URL}/contracts/:id/cancel`, async ({ params, request }) => {
                capturedParams = params;
                capturedBody = await request.json();
                return HttpResponse.json({
                    success: true,
                    data: { id: params.id, status: 'CANCELLED' },
                });
            }),
        );

        const { onDismiss, onCancelled } = renderModal();
        const reason = 'Vendor unavailable for the date';
        await userEvent.type(screen.getByLabelText(/reason/i), reason);
        await userEvent.click(screen.getByRole('button', { name: /cancel contract/i }));

        await waitFor(() => expect(onDismiss).toHaveBeenCalled());
        expect(capturedParams).toEqual({ id: CONTRACT_ID });
        expect(capturedBody).toEqual({ reason });
        expect(onCancelled).toHaveBeenCalledTimes(1);
    });

    test('trims surrounding whitespace from the reason before sending', async () => {
        let capturedBody = null;
        server.use(
            http.post(`${BASE_URL}/contracts/:id/cancel`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ success: true, data: {} });
            }),
        );
        renderModal();
        await userEvent.type(screen.getByLabelText(/reason/i), '   trimmed reason   ');
        await userEvent.click(screen.getByRole('button', { name: /cancel contract/i }));
        await waitFor(() => expect(capturedBody).not.toBeNull());
        expect(capturedBody).toEqual({ reason: 'trimmed reason' });
    });

    test('backend error message is shown inline and modal stays open', async () => {
        server.use(
            http.post(`${BASE_URL}/contracts/:id/cancel`, () =>
                HttpResponse.json(
                    { success: false, message: 'Contract is already cancelled.' },
                    { status: 409 },
                ),
            ),
        );

        const { onDismiss } = renderModal();
        await userEvent.type(screen.getByLabelText(/reason/i), 'try again');
        await userEvent.click(screen.getByRole('button', { name: /cancel contract/i }));

        expect(
            await screen.findByText('Contract is already cancelled.'),
        ).toBeInTheDocument();
        expect(onDismiss).not.toHaveBeenCalled();
    });

    test('character counter updates live up to 1000', async () => {
        renderModal();
        expect(screen.getByText('0/1000')).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText(/reason/i), 'hello');
        expect(screen.getByText('5/1000')).toBeInTheDocument();
    });
});
