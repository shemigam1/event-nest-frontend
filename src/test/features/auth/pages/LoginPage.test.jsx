import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import LoginPage from '@/features/auth/pages/LoginPage';

describe('LoginPage', () => {
    test('disables submit button when fields are empty', () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });

    test('enables submit button when both fields are filled', async () => {
        renderWithProviders(<LoginPage />);
        await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'a@b.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');
        expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });

    test('navigates to events browse on successful login', async () => {
        renderWithProviders(<LoginPage />);
        await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'a@b.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
        await waitFor(() =>
            expect(screen.getByTestId('location')).toHaveTextContent('/events')
        );
    });

    test('shows error message on failed login', async () => {
        server.use(
            http.post('http://localhost:3000/auth/login', () =>
                HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
            )
        );
        renderWithProviders(<LoginPage />);
        await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'a@b.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
        await waitFor(() =>
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
        );
    });
});
