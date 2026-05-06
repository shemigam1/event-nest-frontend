import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import RegisterPage from '@/features/auth/pages/RegisterPage';

vi.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }) => children,
    GoogleLogin: ({ onSuccess, onError }) => (
        <>
            <button onClick={() => onSuccess({ credential: 'fake-google-token' })}>
                Sign up with Google
            </button>
            <button onClick={() => onError()}>
                Fail Google Signup
            </button>
        </>
    ),
}));

describe('RegisterPage', () => {
    test('disables submit button when fields are empty', () => {
        renderWithProviders(<RegisterPage />);
        expect(screen.getByRole('button', { name: /^register$/i })).toBeDisabled();
    });

    test('enables submit button when all fields are filled', async () => {
        renderWithProviders(<RegisterPage />);
        await userEvent.type(screen.getByPlaceholderText(/john doe/i), 'Jane Doe');
        await userEvent.type(screen.getByPlaceholderText(/john@example\.com/i), 'jane@example.com');
        await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
        expect(screen.getByRole('button', { name: /^register$/i })).not.toBeDisabled();
    });

    test('navigates to /login after successful registration', async () => {
        renderWithProviders(<RegisterPage />);
        await userEvent.type(screen.getByPlaceholderText(/john doe/i), 'Jane Doe');
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
        await userEvent.type(screen.getByPlaceholderText(/john doe/i), 'Jane Doe');
        await userEvent.type(screen.getByPlaceholderText(/john@example\.com/i), 'existing@example.com');
        await userEvent.type(screen.getByPlaceholderText(/enter password/i), 'password123');
        await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
        await waitFor(() =>
            expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
        );
    });

    test('navigates to /dashboard on successful Google sign-up', async () => {
        renderWithProviders(<RegisterPage />);
        await userEvent.click(screen.getByRole('button', { name: /sign up with google/i }));
        await waitFor(() =>
            expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
        );
    });

    test('shows error on failed Google sign-up', async () => {
        server.use(
            http.post('http://localhost:3000/social-auth/', () =>
                HttpResponse.json({ message: 'Google auth failed' }, { status: 401 })
            )
        );
        renderWithProviders(<RegisterPage />);
        await userEvent.click(screen.getByRole('button', { name: /fail google signup/i }));
        await waitFor(() =>
            expect(screen.getByText(/google sign-up failed/i)).toBeInTheDocument()
        );
    });
});
