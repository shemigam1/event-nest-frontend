import { createSlice } from "@reduxjs/toolkit";
import { userFromToken } from "@/utils/decodeJwt";

const WORKSPACE_KEY = 'activeWorkspace';
const VENDOR_MODE_KEY = 'vendorModeActive';
const ALLOWED_WORKSPACES = new Set(['ATTENDEE', 'ORGANISER', 'MANAGER', 'VENDOR']);

const storedToken = localStorage.getItem('accessToken');
const storedProfile = (() => {
    const raw = localStorage.getItem('userProfile');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
})();
const tokenUser = userFromToken(storedToken);
const storedWorkspace = (() => {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    return raw && ALLOWED_WORKSPACES.has(raw) ? raw : null;
})();
const storedVendorMode = localStorage.getItem(VENDOR_MODE_KEY) === 'true';

const initialState = {
    user: storedProfile,
    tokenUser,
    token: tokenUser ? storedToken : null,
    refreshToken: tokenUser ? localStorage.getItem('refreshToken') : null,
    isAuthenticated: Boolean(tokenUser),
    // The workspace the user is currently looking at.
    // Only meaningful values now are 'ATTENDEE' (unified user mode) or 'VENDOR'.
    activeWorkspace: tokenUser ? storedWorkspace : null,
    // Whether the user has activated vendor mode in the sidebar toggle.
    // Controls visibility of the "Switch to vendor" button.
    vendorModeActive: tokenUser ? storedVendorMode : false,
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
            state.activeWorkspace = null;
            state.vendorModeActive = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userProfile');
            localStorage.removeItem(WORKSPACE_KEY);
            localStorage.removeItem(VENDOR_MODE_KEY);
        },
        setUser: (state, action) => {
            state.user = action.payload;
            if (action.payload) {
                localStorage.setItem('userProfile', JSON.stringify(action.payload));
            } else {
                localStorage.removeItem('userProfile');
            }
        },
        setActiveWorkspace: (state, action) => {
            const next = action.payload;
            if (next && !ALLOWED_WORKSPACES.has(next)) return;
            state.activeWorkspace = next ?? null;
            if (next) localStorage.setItem(WORKSPACE_KEY, next);
            else localStorage.removeItem(WORKSPACE_KEY);
        },
        setVendorModeActive: (state, action) => {
            state.vendorModeActive = Boolean(action.payload);
            localStorage.setItem(VENDOR_MODE_KEY, action.payload ? 'true' : 'false');
        },
    },
});

export const { setCredentials, logout, setUser, setActiveWorkspace, setVendorModeActive } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentUserId = (state) => state.auth.tokenUser?.sub ?? state.auth.user?.id ?? null;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthEmail = (state) =>
    state.auth.user?.email ?? state.auth.tokenUser?.email ?? null;
export const selectIsAdmin = (state) =>
    state.auth.tokenUser?.roles?.includes('ROLE_ADMIN') ?? false;
export const selectIsCheckinStaff = (state) =>
    state.auth.tokenUser?.roles?.includes('ROLE_CHECKIN_STAFF') ?? false;
export const selectActiveWorkspace = (state) => state.auth.activeWorkspace;
export const selectVendorModeActive = (state) => state.auth.vendorModeActive;

export default authSlice.reducer;
