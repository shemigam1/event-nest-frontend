/**
 * Decode the payload of a JWT without verifying its signature.
 * Returns null if the token is missing or malformed; the caller can then
 * treat the session as unauthenticated and prompt for re-login.
 */
export function decodeJwt(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return null;
    }
}

export function userFromToken(token) {
    const claims = decodeJwt(token);
    if (!claims) return null;
    if (claims.exp && Date.now() >= claims.exp * 1000) return null;
    const sub = claims.sub ?? claims.userId ?? claims.id ?? claims.user_id ?? null;
    return {
        sub,
        email: claims.email ?? sub ?? null,
        roles: Array.isArray(claims.roles) ? claims.roles : [],
    };
}
