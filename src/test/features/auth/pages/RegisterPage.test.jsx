import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import RegisterPage from '@/features/auth/pages/RegisterPage';

describe('RegisterPage', () => {
    test('disables submit button when fields are empty', () => {
        renderWithProviders(<RegisterPage />);
        expect(screen.getByRole('button', { name: /^register$/i })).toBeDisabled();
    });

    test('enables submit button when all fields are filled', async () => {
        renderWithProviders(<RegisterPage />);
        await userEvent.type(screen.getByPlaceholderText(/^john$/i), 'Jane');
        await userEvent.type(screen.getByPlaceholderText(/^doe$/i), 'Doe');
        await userEvent.type(screen.getByPlaceholderText(/john@example\.com/i), 'jane@example.com');
        await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
        expect(screen.getByRole('button', { name: /^register$/i })).not.toBeDisabled();
    });

    test('navigates to /login after successful registration', async () => {
        renderWithProviders(<RegisterPage />);
        await userEvent.type(screen.getByPlaceholderText(/^john$/i), 'Jane');
        await userEvent.type(screen.getByPlaceholderText(/^doe$/i), 'Doe');
        await userEvent.type(screen.getByPlaceholderText(/john@example\.com/i), 'jane@example.com');
        await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
        await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
        await waitFor(() =>
            expect(screen.getByTestId('location')).toHaveTextContent('/login')
        );
    });

    test('shows error message on failed registration', async () => {
        server.use(
            http.post('http://localhost:3000/auth/register', () =>
                HttpResponse.json({ message: 'Email already in use' }, { status: 409 })
            )
        );
        renderWithProviders(<RegisterPage />);
        await userEvent.type(screen.getByPlaceholderText(/^john$/i), 'Jane');
        await userEvent.type(screen.getByPlaceholderText(/^doe$/i), 'Existing');
        await userEvent.type(screen.getByPlaceholderText(/john@example\.com/i), 'existing@example.com');
        await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
        await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
        await waitFor(() =>
            expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
        );
    });
});
