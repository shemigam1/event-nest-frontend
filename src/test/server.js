import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:3000';

/* ── Fixture data ── */
export const MOCK_EVENTS = [
    {
        id: 'evt_001',
        title: 'Moniepoint Merchant Summit 2026',
        description: 'Annual merchant summit.',
        venue: 'Eko Convention Centre, Lagos',
        startTime: '2026-05-16T10:00:00',
        endTime: '2026-05-16T18:00:00',
        status: 'PUBLISHED',
        createdBy: 'user_001',
        rejectionReason: null,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-01T00:00:00',
    },
    {
        id: 'evt_002',
        title: 'Agent Onboarding Workshop · Q2',
        description: 'Hands-on certification.',
        venue: 'Civic Centre, Victoria Island',
        startTime: '2026-05-20T09:00:00',
        endTime: '2026-05-20T17:00:00',
        status: 'PUBLISHED',
        createdBy: 'user_002',
        rejectionReason: null,
        createdAt: '2026-01-02T00:00:00',
        updatedAt: '2026-01-02T00:00:00',
    },
    {
        id: 'evt_003',
        title: 'Partner Certification Day — Lagos',
        description: 'Certification programme.',
        venue: 'Landmark Event Centre',
        startTime: '2026-05-30T14:00:00',
        endTime: '2026-05-30T20:00:00',
        status: 'PUBLISHED',
        createdBy: 'user_003',
        rejectionReason: null,
        createdAt: '2026-01-03T00:00:00',
        updatedAt: '2026-01-03T00:00:00',
    },
];

export const MOCK_TIERS = {
    evt_001: [
        { id: 't1', eventId: 'evt_001', name: 'VIP Front Row', price: 75000, rowPrefix: 'VIP', rowCount: 5, seatsPerRow: 10, totalCapacity: 50, availableCapacity: 12, createdAt: '2026-01-01T00:00:00' },
        { id: 't2', eventId: 'evt_001', name: 'General Admission', price: 25000, rowPrefix: 'GEN', rowCount: 20, seatsPerRow: 20, totalCapacity: 400, availableCapacity: 113, createdAt: '2026-01-01T00:00:00' },
    ],
    evt_002: [
        { id: 't3', eventId: 'evt_002', name: 'Standard', price: 0, rowPrefix: 'A', rowCount: 15, seatsPerRow: 10, totalCapacity: 150, availableCapacity: 8, createdAt: '2026-01-02T00:00:00' },
    ],
    evt_003: [
        { id: 't4', eventId: 'evt_003', name: 'Certificate Track', price: 35000, rowPrefix: 'C', rowCount: 8, seatsPerRow: 10, totalCapacity: 80, availableCapacity: 32, createdAt: '2026-01-03T00:00:00' },
    ],
};

/* ── Default handlers ── */
export const server = setupServer(
    // Auth
    http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json({
            success: true,
            message: 'login successful',
            data: {
                accessToken: 'fake-access-token',
                refreshToken: 'fake-refresh-token',
                tokenType: 'Bearer',
            },
        })
    ),

    http.post(`${BASE_URL}/auth/register`, () =>
        HttpResponse.json({
            success: true,
            message: 'registration successful',
            data: {
                id: 'abc-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                role: 'ATTENDEE',
            },
        }, { status: 201 })
    ),

    // Events list
    http.get(`${BASE_URL}/events`, () =>
        HttpResponse.json({ success: true, data: MOCK_EVENTS })
    ),

    // Single event
    http.get(`${BASE_URL}/events/:id`, ({ params }) => {
        const event = MOCK_EVENTS.find(e => e.id === params.id);
        if (!event) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: event });
    }),

    // Tiers for an event
    http.get(`${BASE_URL}/events/:eventId/tiers`, ({ params }) => {
        const tiers = MOCK_TIERS[params.eventId] ?? [];
        return HttpResponse.json({ success: true, data: tiers });
    }),
);
