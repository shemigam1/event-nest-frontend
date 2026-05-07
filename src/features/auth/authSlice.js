import { createSlice } from "@reduxjs/toolkit";
import { userFromToken } from "@/utils/decodeJwt";

const storedToken = localStorage.getItem('accessToken');
const storedProfile = (() => {
    const raw = localStorage.getItem('userProfile');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
})();
const tokenUser = userFromToken(storedToken);

const initialState = {
    user: storedProfile,
    tokenUser,
    token: tokenUser ? storedToken : null,
    refreshToken: tokenUser ? localStorage.getItem('refreshToken') : null,
    isAuthenticated: Boolean(tokenUser),
};

if (!tokenUser && storedToken) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { accessToken, refreshToken } = action.payload;
            state.token = accessToken;
            state.refreshToken = refreshToken;
            state.tokenUser = userFromToken(accessToken);
            state.isAuthenticated = Boolean(state.tokenUser);
            localStorage.setItem('accessToken', accessToken);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        },
        logout: (state) => {
            state.user = null;
            state.tokenUser = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userProfile');
        },
        setUser: (state, action) => {
            state.user = action.payload;
            if (action.payload) {
                localStorage.setItem('userProfile', JSON.stringify(action.payload));
            } else {
                localStorage.removeItem('userProfile');
            }
        },
    },
});

export const { setCredentials, logout, setUser } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthEmail = (state) =>
    state.auth.user?.email ?? state.auth.tokenUser?.email ?? null;
export const selectIsAdmin = (state) =>
    state.auth.tokenUser?.roles?.includes('ROLE_ADMIN') ?? false;

export default authSlice.reducer;
