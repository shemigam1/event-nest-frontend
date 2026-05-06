import { expect } from 'vitest';
import reducer, { setCredentials, logout } from '@/features/auth/authSlice';

test('setCredentials stores access token and marks authenticated', () => {
    const state = reducer(undefined, setCredentials({
        accessToken: 'access-abc',
        refreshToken: 'refresh-abc',
        tokenType: 'Bearer',
    }));
    expect(state.token).toBe('access-abc');
    expect(state.refreshToken).toBe('refresh-abc');
    expect(state.isAuthenticated).toBe(true);
});

test('logout clears tokens and marks unauthenticated', () => {
    const initialState = {
        user: null,
        token: 'access-abc',
        refreshToken: 'refresh-abc',
        isAuthenticated: true,
    };
    const state = reducer(initialState, logout());
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
});
