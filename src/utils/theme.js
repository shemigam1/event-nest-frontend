/* ────────────────────────────────────────────────────────────────────────────
   Theme — light / dark / system mode toggle.

   The CSS already declares `[data-theme="dark"]` tokens (see index.css ~L149)
   and registers a Tailwind `dark:` variant via `@custom-variant dark`.
   This module is the JS half: it picks the right value at boot, writes it to
   <html data-theme>, and listens for system-preference flips when the user
   chose "system".

   Persisted to localStorage under the `theme` key. Public API:
       initTheme()         — call once at app boot (before React renders).
       getTheme()          — read the user-saved preference ('light'|'dark'|'system').
       setTheme(mode)      — write preference + sync DOM.
       resolveTheme()      — what's *actually* on screen right now ('light'|'dark').
       subscribeTheme(fn)  — fires whenever the resolved theme changes.
   ──────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'theme';
const VALID = new Set(['light', 'dark', 'system']);

let mediaQuery = null;
const listeners = new Set();

function readStored() {
    // Default to 'light' — the EventNest v2 design (per dreamdevs-event/project/v2)
    // is authored in light mode and that's the canonical look. Dark mode is
    // supplemental; users opt in from Settings → Appearance.
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return VALID.has(v) ? v : 'light';
    } catch {
        return 'light';
    }
}

function systemPrefersDark() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDom(resolved) {
    if (typeof document === 'undefined') return;
    if (resolved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

export function getTheme() {
    return readStored();
}

export function resolveTheme(mode = readStored()) {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return systemPrefersDark() ? 'dark' : 'light';
}

export function setTheme(mode) {
    if (!VALID.has(mode)) return;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
    const resolved = resolveTheme(mode);
    applyDom(resolved);
    listeners.forEach((fn) => { try { fn(resolved, mode); } catch { /* ignore */ } });
}

export function subscribeTheme(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function initTheme() {
    const mode = readStored();
    applyDom(resolveTheme(mode));

    // When the user picks "system", track the OS preference live.
    if (typeof window !== 'undefined' && window.matchMedia && !mediaQuery) {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (readStored() === 'system') {
                const resolved = resolveTheme('system');
                applyDom(resolved);
                listeners.forEach((fn) => { try { fn(resolved, 'system'); } catch { /* ignore */ } });
            }
        };
        if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', handler);
        else if (mediaQuery.addListener) mediaQuery.addListener(handler);
    }
}
