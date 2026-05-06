import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import LoginPage from '@/features/auth/pages/LoginPage';

vi.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }) => children,
    GoogleLogin: ({ onSuccess, onError }) => (
        <>
            <button onClick={() => onSuccess({ credential: 'fake-google-token' })}>
                Sign in with Google
            </button>
            <button onClick={() => onError()}>
                Fail Google Login
            </button>
        </>
    ),
}));

describe('LoginPage', () => {
    test('disables submit button when fields are empty', () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByRole('button', { name: /^login$/i })).toBeDisabled();
    });

    test('enables submit button when both fields are filled', async () => {
        renderWithProviders(<LoginPage />);
        await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'a@b.com');
        await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
        expect(screen.getByRole('button', { name: /^login$/i })).not.toBeDisabled();
    });

    test('shows error message on failed login', async () => {
        server.use(
            http.post('http://localhost:3000/auth/login', () =>
                HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
            )
        );
        renderWithProviders(<LoginPage />);
        await userEvent.type(screen.getByPlaceholderText(/enter your email/i), 'a@b.com');
        await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpass');
        await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
        await waitFor(() =>
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
        );
    });

    test('navigates to dashboard on successful Google login', async () => {
        renderWithProviders(<LoginPage />);
        await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
        await waitFor(() =>
            expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
        );
    });

    test('shows error message on failed Google login', async () => {
        server.use(
            http.post('http://localhost:3000/social-auth/', () =>
                HttpResponse.json({ message: 'Google auth failed' }, { status: 401 })
            )
        );
        renderWithProviders(<LoginPage />);
        await userEvent.click(screen.getByRole('button', { name: /fail google login/i }));
        await waitFor(() =>
            expect(screen.getByText(/google login failed/i)).toBeInTheDocument()
        );
    });
});
