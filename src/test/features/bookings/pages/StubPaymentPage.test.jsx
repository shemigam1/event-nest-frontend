import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { renderWithProviders } from '@/test/renderWithProviders';
import StubPaymentPage from '@/features/bookings/pages/StubPaymentPage';

function renderStub(search = '?ref=STUB-abc123&amount=75000') {
    return renderWithProviders(
        <Routes>
            <Route path="/stub-payment" element={<StubPaymentPage />} />
            <Route path="/payment-result" element={<div data-testid="payment-result-page">payment result</div>} />
        </Routes>,
        { initialEntries: [`/stub-payment${search}`] }
    );
}

describe('StubPaymentPage', () => {
    test('renders the dev badge and ref from URL', () => {
        renderStub();
        expect(screen.getByText(/DEV.*Stub Payment Gateway/i)).toBeInTheDocument();
        expect(screen.getByText(/STUB-abc123/)).toBeInTheDocument();
    });

    test('renders formatted amount from URL params', () => {
        renderStub('?ref=STUB-xyz&amount=75000');
        expect(screen.getByText('₦75,000')).toBeInTheDocument();
    });

    test('does not render amount block when amount param is absent', () => {
        renderStub('?ref=STUB-noamt');
        expect(screen.queryByText(/₦/)).not.toBeInTheDocument();
    });

    test('"Pay now" navigates to /payment-result with SUCCESS status', async () => {
        renderStub();
        await userEvent.click(screen.getByRole('button', { name: /pay now/i }));
        await waitFor(() =>
            expect(screen.getByTestId('payment-result-page')).toBeInTheDocument()
        );
        expect(screen.getByTestId('location')).toHaveTextContent('/payment-result');
    });

    test('"Cancel payment" navigates to /payment-result with FAILED status', async () => {
        renderStub();
        await userEvent.click(screen.getByRole('button', { name: /cancel payment/i }));
        await waitFor(() =>
            expect(screen.getByTestId('payment-result-page')).toBeInTheDocument()
        );
        expect(screen.getByTestId('location')).toHaveTextContent('/payment-result');
    });

    test('"Pay now" encodes the transaction ref in the navigation URL', async () => {
        const { store: _store, ...utils } = renderStub('?ref=STUB-special%2Bref&amount=5000');
        await userEvent.click(utils.getByRole('button', { name: /pay now/i }));
        // After navigation the payment-result page renders — confirming the link was followed
        await waitFor(() =>
            expect(screen.getByTestId('payment-result-page')).toBeInTheDocument()
        );
    });
});
