import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import LoginPage from '@/features/auth/pages/LoginPage';

test('disables button when fields are empty', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
});

test('shows error message on failed login', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
    userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => 
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
        );
    });