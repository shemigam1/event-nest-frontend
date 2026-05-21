import { useEffect, useId, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/utils/googleMaps';
import { Icons } from './Icon';

/* ────────────────────────────────────────────────────────────────────────────
   VenueAutocomplete — venue picker backed by Google Places.

   Uses the new google.maps.places.PlaceAutocompleteElement web component
   (the post-March-2025 successor to the legacy `Autocomplete` class, which
   Google blocks for new Cloud projects).

   To use this in your Google Cloud Console you must:
     1. Enable "Maps JavaScript API"
     2. Enable "Places API (New)"  ← critical; the legacy "Places API" is NOT enough
     3. Enable billing on the project
     4. (Optional) Restrict the API key to your dev/prod origins

   The element renders its own input UI. We wrap it with our standard label,
   helper-line, and map-preview chrome so it visually matches the rest of the
   form. Some Material design tokens on the element are themed via CSS custom
   properties so the dropdown picks up our brand colour and spacing.

   onChange contract:
     · Fires on selection with the place's formatted address as the value
       (matches the existing Input contract — { target: { value } }).
     · Also fires when the user clears the input.
     · onPlaceSelect(summary) is called only on a real picked suggestion, with
       { address, lat, lng, placeId, name } for callers that want lat/lng.

   Graceful degradation: if VITE_GOOGLE_MAPS_API_KEY is missing, the field
   falls back to a plain text input.
   ──────────────────────────────────────────────────────────────────────── */

export default function VenueAutocomplete({
    label = 'Venue',
    placeholder = 'Search for a venue or address',
    value,
    onChange,
    onPlaceSelect,
    error,
    country = 'ng',
    showMapPreview = true,
}) {
    const slotRef = useRef(null);
    const elementRef = useRef(null);
    const inputId = useId();
    const [status, setStatus] = useState('idle');  // 'idle' | 'loading' | 'ready' | 'error'
    const [selectedPlace, setSelectedPlace] = useState(null);
    const enabled = hasGoogleMapsKey();

    // Mount the PlaceAutocompleteElement once.
    useEffect(() => {
        if (!enabled || !slotRef.current) return;
        let cancelled = false;
        setStatus('loading');

        loadGoogleMaps()
            .then(async (google) => {
                if (cancelled || !google || !slotRef.current) return;
                if (!google.maps?.places?.PlaceAutocompleteElement) {
                    throw new Error(
                        'PlaceAutocompleteElement is not available. Make sure ' +
                        '"Places API (New)" is enabled on your Google Cloud project.'
                    );
                }

                const ac = new google.maps.places.PlaceAutocompleteElement({
                    // ISO 3166-1 alpha-2 (uppercase), e.g. ['NG'].
                    includedRegionCodes: country ? [country.toUpperCase()] : undefined,
                });

                // The web component renders its own input — stretch it to fill
                // our slot so it looks like a normal form field.
                ac.style.width = '100%';

                // Seed the input with the parent's current value (e.g. when
                // editing a saved event).
                if (value) {
                    try { ac.value = value; } catch { /* ignore */ }
                }

                // Selection — fires when the user clicks a suggestion. The
                // new API gives us a `placePrediction` we resolve into a Place
                // with the specific fields we need.
                ac.addEventListener('gmp-select', async (e) => {
                    try {
                        const prediction = e.placePrediction;
                        if (!prediction) return;
                        const place = prediction.toPlace();
                        // addressComponents are needed to derive city/country
                        // for the backend's required CreateEventRequest fields.
                        await place.fetchFields({
                            fields: ['displayName', 'formattedAddress', 'location', 'id', 'addressComponents'],
                        });

                        const address = place.formattedAddress || prediction.text?.toString() || '';
                        const lat = place.location?.lat?.();
                        const lng = place.location?.lng?.();
                        const { city, country, neighbourhood } = parseAddressComponents(place.addressComponents);
                        const summary = {
                            address,
                            lat,
                            lng,
                            placeId: place.id,
                            name: place.displayName,
                            city,
                            country,
                            neighbourhood,
                        };
                        setSelectedPlace(summary);
                        onChange?.({ target: { value: address } });
                        onPlaceSelect?.(summary);
                    } catch (err) {
                        // eslint-disable-next-line no-console
                        console.warn('[VenueAutocomplete] place fetch failed:', err);
                    }
                });

                // Manual typing — keep the parent's state in sync even when
                // the user doesn't pick a suggestion, otherwise hitting
                // Submit with a typed-but-unpicked venue would lose the text.
                ac.addEventListener('input', () => {
                    const v = ac.value ?? '';
                    if (selectedPlace && v !== selectedPlace.address) setSelectedPlace(null);
                    onChange?.({ target: { value: v } });
                });

                // The slot div is React-empty (see render) so we own it
                // entirely here — no innerHTML wipe needed, which would clash
                // with React's reconciliation if it ever rendered a child.
                slotRef.current.appendChild(ac);
                elementRef.current = ac;
                setStatus('ready');
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[VenueAutocomplete] Google Maps unavailable:', err.message);
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
            if (elementRef.current) {
                try { elementRef.current.remove(); } catch { /* ignore */ }
                elementRef.current = null;
            }
        };
        // Only re-mount when the key/enabled flag flips; country doesn't need
        // to re-bind in practice (it's a constant per page).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    // Keep the web component's value in sync if the parent clears or overrides it.
    useEffect(() => {
        const el = elementRef.current;
        if (!el) return;
        if ((value ?? '') !== (el.value ?? '')) {
            try { el.value = value ?? ''; } catch { /* ignore */ }
        }
        if (!value && selectedPlace) setSelectedPlace(null);
    }, [value, selectedPlace]);

    return (
        <div>
            {label && (
                <label
                    htmlFor={inputId}
                    style={{
                        display: 'block',
                        fontSize: 14, fontWeight: 500,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}
                >
                    {label}
                </label>
            )}

            {/*
                Two siblings, never overlapping React-owned and imperatively-
                mutated DOM in the same node (which was triggering
                "removeChild ... not a child of this node" on unmount):

                  · slotRef → ALWAYS empty as far as React is concerned. We
                    appendChild the Google web component into this on load.
                    Hidden until the element actually mounts.
                  · FallbackInput → a normal React tree, only rendered when
                    the Google element isn't ready or available.
            */}
            <div
                ref={slotRef}
                style={{
                    // Material color tokens consumed by the element.
                    '--gmp-mat-color-primary':                       'var(--mp-blue)',
                    '--gmp-mat-color-on-surface':                    'var(--text-1)',
                    '--gmp-mat-color-on-surface-variant':            'var(--text-2)',
                    '--gmp-mat-color-surface':                       'var(--surface-elevated)',
                    '--gmp-mat-color-surface-container-high':        'var(--surface-elevated)',
                    '--gmp-mat-color-surface-container-highest':     'var(--surface-subtle)',
                    '--gmp-mat-color-secondary-container':           'var(--mp-blue-50)',
                    '--gmp-mat-color-outline':                       error ? 'var(--error)' : 'var(--border)',
                    '--gmp-mat-font-family':                         'var(--font-sans)',
                    // Keep the slot allocated even when hidden so layout
                    // doesn't jump when the Google element mounts.
                    minHeight: 44,
                    display: status === 'ready' ? 'block' : 'none',
                }}
            />

            {status !== 'ready' && (
                <FallbackInput
                    id={inputId}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    error={error}
                    disabled={status === 'loading'}
                />
            )}

            {/* Helper line: status + powered-by. */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 6, fontSize: 12, color: 'var(--text-3)',
                minHeight: 16, gap: 12,
            }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                    {error ? (
                        <span style={{ color: 'var(--error)' }}>{error}</span>
                    ) : !enabled ? (
                        'Type the venue manually — Maps autocomplete is not configured.'
                    ) : status === 'error' ? (
                        <span style={{ color: 'var(--error)' }}>
                            Couldn&apos;t load Google Maps. Check that the API key is valid and
                            &quot;Places API (New)&quot; is enabled.
                        </span>
                    ) : status === 'loading' ? (
                        'Loading suggestions…'
                    ) : (
                        'Start typing to see suggestions.'
                    )}
                </span>
                {enabled && (
                    <span style={{ fontSize: 11, flexShrink: 0 }}>Powered by Google Maps</span>
                )}
            </div>

            {showMapPreview && selectedPlace?.lat != null && selectedPlace?.lng != null && (
                <MapPreview
                    lat={selectedPlace.lat}
                    lng={selectedPlace.lng}
                    label={selectedPlace.name || selectedPlace.address}
                />
            )}
        </div>
    );
}

/* Plain-input fallback. Used when:
     · There's no Google Maps API key configured, OR
     · The Places library failed to load (bad key, billing off, etc.)
   We still want the form to be submittable, so users can type the venue. */
function FallbackInput({ id, value, placeholder, onChange, error, disabled }) {
    return (
        <span style={{ position: 'relative', display: 'block' }}>
            <span style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)', display: 'flex',
                pointerEvents: 'none',
            }}>
                <Icons.pin size={16} />
            </span>
            <input
                id={id}
                type="text"
                placeholder={placeholder}
                value={value ?? ''}
                onChange={onChange}
                disabled={disabled}
                style={{
                    width: '100%',
                    height: 44,
                    padding: '0 14px 0 42px',
                    background: 'var(--surface-elevated)',
                    border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                    borderRadius: 12,
                    fontSize: 16,
                    color: 'var(--text-1)',
                    transition: 'all var(--motion-fast)',
                    boxSizing: 'border-box',
                }}
            />
        </span>
    );
}

/* Pull city / country / neighbourhood out of the Place's addressComponents
   array — the new Places API returns these with `types` arrays like
   ["locality"], ["country","political"], etc.

   Cities are tricky in international data: "locality" covers most cases,
   but some places (rural areas, federal capitals) use "postal_town" or
   "administrative_area_level_2" instead. We try each in order and take the
   first hit. */
function parseAddressComponents(components = []) {
    const out = { city: null, country: null, neighbourhood: null };
    if (!Array.isArray(components)) return out;

    const findByType = (...types) => {
        for (const t of types) {
            const c = components.find((comp) => (comp.types ?? []).includes(t));
            if (c) return c.longText || c.long_name || c.shortText || c.short_name || null;
        }
        return null;
    };

    out.city = findByType('locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1');
    out.country = findByType('country');
    out.neighbourhood = findByType('neighborhood', 'sublocality_level_1', 'sublocality');
    return out;
}

/* Small embedded map showing the picked pin. Re-uses the already-loaded
   Maps JS, so no extra network round-trip. */
function MapPreview({ lat, lng, label }) {
    const containerRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        loadGoogleMaps().then((google) => {
            if (cancelled || !google || !containerRef.current) return;
            const map = new google.maps.Map(containerRef.current, {
                center: { lat, lng },
                zoom: 15,
                disableDefaultUI: true,
                gestureHandling: 'cooperative',
                clickableIcons: false,
            });
            new google.maps.Marker({
                position: { lat, lng },
                map,
                title: label,
            });
        });
        return () => { cancelled = true; };
    }, [lat, lng, label]);

    return (
        <div
            ref={containerRef}
            aria-label={`Map showing ${label}`}
            style={{
                marginTop: 10,
                height: 160,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
                overflow: 'hidden',
            }}
        />
    );
}
