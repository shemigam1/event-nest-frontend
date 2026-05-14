import { Client } from '@stomp/stompjs';

let client = null;
const callbacks = new Map();       // destination → Set<Function>
const activeStompSubs = new Map(); // destination → STOMP subscription handle

function getHttpBase() {
    const api = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
    return api.replace('/api/v1', '');
}

function doSubscribe(destination) {
    if (!client?.connected || activeStompSubs.has(destination)) return;
    const sub = client.subscribe(destination, (frame) => {
        try {
            const msg = JSON.parse(frame.body);
            callbacks.get(destination)?.forEach(cb => cb(msg));
        } catch (e) {
            console.error('[STOMP] parse error', e);
        }
    });
    activeStompSubs.set(destination, sub);
}

export async function stompConnect(token, { onConnect, onError } = {}) {
    if (client?.active) return;

    // Dynamically import SockJS — Spring Boot's /ws endpoint uses the SockJS
    // protocol and rejects raw native WebSocket upgrades.
    let SockJS;
    try {
        const mod = await import('sockjs-client');
        SockJS = mod.default ?? mod;
    } catch (e) {
        console.error('[STOMP] SockJS unavailable:', e);
        onError?.('Chat library failed to load. Please refresh.');
        return;
    }

    const base = getHttpBase();

    client = new Client({
        webSocketFactory: () => new SockJS(`${base}/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
            activeStompSubs.clear();
            callbacks.forEach((cbs, dest) => {
                if (cbs.size > 0) doSubscribe(dest);
            });
            onConnect?.();
        },
        onDisconnect: () => {
            activeStompSubs.clear();
        },
        onStompError: (frame) => {
            console.error('[STOMP]', frame.headers?.message);
            onError?.(frame.headers?.message ?? 'STOMP error');
        },
        onWebSocketError: (e) => {
            console.error('[STOMP WS]', e);
            onError?.('WebSocket connection failed');
        },
    });

    client.activate();
}

export function stompDisconnect() {
    client?.deactivate();
    client = null;
    callbacks.clear();
    activeStompSubs.clear();
}

export function stompSubscribe(destination, callback) {
    if (!callbacks.has(destination)) callbacks.set(destination, new Set());
    callbacks.get(destination).add(callback);
    if (client?.connected) doSubscribe(destination);

    return () => {
        callbacks.get(destination)?.delete(callback);
        if (callbacks.get(destination)?.size === 0) {
            callbacks.delete(destination);
            const sub = activeStompSubs.get(destination);
            sub?.unsubscribe();
            activeStompSubs.delete(destination);
        }
    };
}

export function stompSend(conversationId, content) {
    if (!client?.connected) return false;
    client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ conversationId, content, messageType: 'TEXT' }),
    });
    return true;
}
