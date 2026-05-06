import { expect } from 'vitest';
import reducer, { setCredentials, logout } from '@/features/auth/authSlice';

test('setCredentials Store user and token', () => {
    const state = reducer(undefined, setCredentials({ user: { id: 1, name: 'John Doe' }, token: 'abc123' }));
    expect(state.user).toEqual({ id: 1, name: 'John Doe' });
    expect(state.token).toBe('abc123');
    expect(state.isAuthenticated).toBe(true);
})

test('logout clears user and token', () => {
    const initialState = {
        user: { id: 1, name: 'John Doe' }, isAuthenticated: true, token: 'abc123'
    };
    const state = reducer(initialState, logout());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
});