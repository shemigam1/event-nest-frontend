const manifestKey = (eventId) => `checkin_manifest_${eventId}`;
const queueKey    = (eventId) => `checkin_queue_${eventId}`;
const scannedKey  = (eventId, dayId) => `checkin_scanned_${eventId}_${dayId ?? 'all'}`;

// ── Manifest ────────────────────────────────────────────────────────────────

export function saveManifest(eventId, manifest) {
    try { localStorage.setItem(manifestKey(eventId), JSON.stringify(manifest)); }
    catch { /* quota exceeded — fail silently */ }
}

export function loadManifest(eventId) {
    try {
        const raw = localStorage.getItem(manifestKey(eventId));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function clearManifest(eventId) {
    localStorage.removeItem(manifestKey(eventId));
}

/**
 * Build a Map from every ticket code variant → entry for O(1) offline lookups.
 * A ticket can be scanned as its UUID qrCode, 8-char shortCode, or signed payload.
 */
export function buildManifestIndex(tickets) {
    const idx = new Map();
    for (const t of tickets) {
        if (t.ticketCode)    idx.set(t.ticketCode,    t);
        if (t.shortCode)     idx.set(t.shortCode,     t);
        if (t.signedPayload) idx.set(t.signedPayload, t);
    }
    return idx;
}

// ── Offline scan queue ───────────────────────────────────────────────────────

export function enqueueOfflineScan(eventId, scan) {
    const queue = loadQueue(eventId);
    queue.push(scan);
    try { localStorage.setItem(queueKey(eventId), JSON.stringify(queue)); }
    catch { /* quota exceeded */ }
}

export function loadQueue(eventId) {
    try {
        const raw = localStorage.getItem(queueKey(eventId));
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function clearQueue(eventId) {
    localStorage.removeItem(queueKey(eventId));
}

// ── Local scanned set (per event-day) ───────────────────────────────────────

export function addToLocalScanned(eventId, dayId, ticketCode) {
    const scanned = loadLocalScanned(eventId, dayId);
    scanned.add(ticketCode);
    try { localStorage.setItem(scannedKey(eventId, dayId), JSON.stringify([...scanned])); }
    catch { /* quota exceeded */ }
}

export function loadLocalScanned(eventId, dayId) {
    try {
        const raw = localStorage.getItem(scannedKey(eventId, dayId));
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}
