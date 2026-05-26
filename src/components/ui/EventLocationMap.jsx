import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/utils/googleMaps';
import { Icons } from './Icon';

/* ────────────────────────────────────────────────────────────────────────────
   EventLocationMap — interactive Google Maps preview shown on the event
   detail page for attendees.

   Behaviour:
     · If we have lat/lng AND a Maps key is configured → renders an embedded,
       interactive map centred on the venue with a marker. The whole tile is
       clickable; clicking opens Google Maps (app on mobile, web on desktop)
       focused on the venue coords.
     · If lat/lng is missing but we have a venue name → still shows a clickable
       "Open in Google Maps" CTA that searches by venue name.
     · If neither, the component renders nothing (parent can show a venue
       address instead).
   ──────────────────────────────────────────────────────────────────────── */

export default function EventLocationMap({
    lat,
    lng,
    venueName,
    address,
    height = 200,
}) {
    const hasCoords = lat != null && lng != null;
    const label = venueName || address || 'Event venue';
    const enabled = hasGoogleMapsKey();

    // URL that opens Google Maps focused on the venue. On mobile this opens
    // the native Maps app; on desktop it opens maps.google.com.
    const mapsUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : label
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
            : null;

    if (!mapsUrl) return null;

    // No coords or no Maps key — render the link-only fallback.
    if (!hasCoords || !enabled) {
        return (
            <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface-elevated)',
                    color: 'var(--mp-blue)',
                    fontSize: 14, fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: 10,
                }}
            >
                <Icons.pin size={16} />
                Open in Google Maps
                <Icons.arrowR size={14} />
            </a>
        );
    }

    return <InteractiveMap lat={lat} lng={lng} label={label} mapsUrl={mapsUrl} height={height} />;
}

function InteractiveMap({ lat, lng, label, mapsUrl, height }) {
    const containerRef = useRef(null);
    const [ready, setReady] = useState(false);

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
            new google.maps.Marker({ position: { lat, lng }, map, title: label });
            setReady(true);
        });
        return () => { cancelled = true; };
    }, [lat, lng, label]);

    function openMaps() {
        // window.open returns null on some PWAs / in-app browsers; in that case
        // fall back to direct navigation so the user still gets there.
        const w = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        if (!w) window.location.href = mapsUrl;
    }

    return (
        <div
            style={{
                marginTop: 10,
                position: 'relative',
                borderRadius: 12,
                border: '1px solid var(--border)',
                overflow: 'hidden',
            }}
        >
            {/* The actual interactive map — kept enabled so users can pinch/zoom
                without leaving the page. */}
            <div
                ref={containerRef}
                aria-label={`Map showing ${label}`}
                style={{ height, background: 'var(--surface-subtle)' }}
            />

            {/* Loading state placeholder — visible until the SDK callback fires. */}
            {!ready && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-3)', fontSize: 13,
                    }}
                >
                    Loading map…
                </div>
            )}

            {/* "Open in Maps" CTA pinned to the bottom of the tile. Doesn't
                intercept the map's own gestures — only the button itself is
                clickable. */}
            <button
                type="button"
                onClick={openMaps}
                aria-label="Open in Google Maps"
                style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-elevated)',
                    color: 'var(--mp-blue)',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2,16,45,0.12)',
                }}
            >
                <Icons.pin size={13} />
                Open in Maps
                <Icons.arrowR size={12} />
            </button>
        </div>
    );
}
