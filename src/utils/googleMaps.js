/* ────────────────────────────────────────────────────────────────────────────
   Google Maps JS API loader (singleton).

   Lazily injects the script tag the first time something asks for it, and
   reuses the same promise for every subsequent caller so we never load the
   library twice (Google logs a warning + may mis-bind handlers if you do).

   The key comes from VITE_GOOGLE_MAPS_API_KEY. If it's missing, loadGoogleMaps
   resolves to `null` — callers should treat that as "feature disabled" and
   gracefully fall back (plain text input, no map preview, etc).
   ──────────────────────────────────────────────────────────────────────── */

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaderPromise = null;

export function hasGoogleMapsKey() {
    return Boolean(KEY && KEY.length > 0 && !KEY.startsWith('your-'));
}

/**
 * Load the Maps JS API with the `places` library.
 * Returns a Promise<window.google | null>. Resolves to null when no key is
 * configured so callers can degrade gracefully without try/catching.
 */
export function loadGoogleMaps() {
    if (!hasGoogleMapsKey()) return Promise.resolve(null);
    if (loaderPromise) return loaderPromise;

    // Already loaded by another path (e.g. the script existed before this
    // module ran). Reuse it.
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
        loaderPromise = Promise.resolve(window.google);
        return loaderPromise;
    }

    loaderPromise = new Promise((resolve, reject) => {
        // Google's loader calls this callback once everything is ready.
        const callbackName = '__gmapsReadyCb_' + Math.random().toString(36).slice(2, 8);
        window[callbackName] = () => {
            delete window[callbackName];
            resolve(window.google);
        };

        const script = document.createElement('script');
        script.src =
            `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}` +
            `&libraries=places&loading=async&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            delete window[callbackName];
            loaderPromise = null; // allow retry
            reject(new Error('Failed to load Google Maps script'));
        };
        document.head.appendChild(script);
    });

    return loaderPromise;
}
