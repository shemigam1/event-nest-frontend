import { expect } from 'vitest';
import reducer, { setCredentials, logout } from '@/features/auth/authSlice';

/** Build a non-expired, structurally-valid JWT for testing the auth slice. */
function makeAccessToken() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'a@b.com',
        email: 'a@b.com',
        roles: ['ROLE_USER'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    return `${header}.${payload}.signature`;
}

test('setCredentials stores access token and marks authenticated', () => {
    const accessToken = makeAccessToken();
    const state = reducer(undefined, setCredentials({
        accessToken,
        refreshToken: 'refresh-abc',
        tokenType: 'Bearer',
    }));
    expect(state.token).toBe(accessToken);
    expect(state.refreshToken).toBe('refresh-abc');
    expect(state.isAuthenticated).toBe(true);
    expect(state.tokenUser?.email).toBe('a@b.com');
});

test('setCredentials with malformed token leaves session unauthenticated', () => {
    const state = reducer(undefined, setCredentials({
        accessToken: 'not-a-jwt',
        refreshToken: 'refresh-abc',
        tokenType: 'Bearer',
    }));
    expect(state.isAuthenticated).toBe(false);
    expect(state.tokenUser).toBeNull();
});

test('logout clears tokens and marks unauthenticated', () => {
    const initialState = {
        user: null,
        tokenUser: { email: 'a@b.com', roles: [] },
        token: 'access-abc',
        refreshToken: 'refresh-abc',
        isAuthenticated: true,
    };
    const state = reducer(initialState, logout());
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
});
