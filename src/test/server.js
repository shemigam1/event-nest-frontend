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

export const MOCK_TICKETS = [
    {
        id: 'tk_001',
        bookingId: 'bk_001',
        tierId: 't1',
        tierName: 'VIP Front Row',
        eventId: 'evt_001',
        eventTitle: 'Moniepoint Merchant Summit 2026',
        seatNumber: 'VIP2-5',
        qrCode: 'qr_a8f3-72ce-bb1d',
        status: 'VALID',
        checkedInAt: null,
        issuedAt: '2026-05-01T10:00:00',
    },
    {
        id: 'tk_002',
        bookingId: 'bk_001',
        tierId: 't1',
        tierName: 'VIP Front Row',
        eventId: 'evt_001',
        eventTitle: 'Moniepoint Merchant Summit 2026',
        seatNumber: 'VIP2-6',
        qrCode: 'qr_a8f3-72ce-bb1e',
        status: 'VALID',
        checkedInAt: null,
        issuedAt: '2026-05-01T10:00:00',
    },
    {
        id: 'tk_003',
        bookingId: 'bk_002',
        tierId: 't3',
        tierName: 'Standard',
        eventId: 'evt_002',
        eventTitle: 'Agent Onboarding Workshop · Q2',
        seatNumber: 'A07-3',
        qrCode: 'qr_4dd1-9221-aa07',
        status: 'USED',
        checkedInAt: '2026-04-28T18:14:00',
        issuedAt: '2026-04-25T09:00:00',
    },
];

export const MOCK_MY_BOOKINGS = [
    {
        id: 'bk_001',
        eventId: 'evt_001',
        eventTitle: 'Moniepoint Merchant Summit 2026',
        tierId: 't1',
        tierName: 'VIP Front Row',
        quantity: 2,
        totalAmount: 150000,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentReference: 'sim_ref_001',
        createdAt: '2026-05-01T10:00:00',
        tickets: [],
    },
    {
        id: 'bk_002',
        eventId: 'evt_002',
        eventTitle: 'Agent Onboarding Workshop · Q2',
        tierId: 't3',
        tierName: 'Standard',
        quantity: 1,
        totalAmount: 0,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentReference: 'sim_ref_002',
        createdAt: '2026-04-25T09:00:00',
        tickets: [],
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

    // Create event
    http.post(`${BASE_URL}/events`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            success: true,
            message: 'Event created successfully',
            data: {
                id: 'evt_new_001',
                title: body.title,
                description: null,
                venue: body.venue,
                startTime: body.startTime,
                endTime: body.endTime,
                status: 'DRAFT',
                createdBy: 'user_001',
                rejectionReason: null,
                createdAt: '2026-05-07T00:00:00',
                updatedAt: '2026-05-07T00:00:00',
            },
        }, { status: 201 });
    }),

    // Submit event for approval (must come before generic PATCH /:id)
    http.patch(`${BASE_URL}/events/:id/submit`, ({ params }) =>
        HttpResponse.json({
            success: true,
            message: 'Event submitted for approval',
            data: {
                id: params.id,
                status: 'PENDING_APPROVAL',
            },
        })
    ),

    // Update event
    http.patch(`${BASE_URL}/events/:id`, async ({ params, request }) => {
        const body = await request.json();
        const existing = MOCK_EVENTS.find(e => e.id === params.id) ?? {};
        return HttpResponse.json({
            success: true,
            message: 'Event updated successfully',
            data: { ...existing, id: params.id, status: 'DRAFT', ...body },
        });
    }),

    // Single event
    http.get(`${BASE_URL}/events/:id`, ({ params }) => {
        const event = MOCK_EVENTS.find(e => e.id === params.id);
        if (!event) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: event });
    }),

    // Create tier (must come before GET tiers)
    http.post(`${BASE_URL}/events/:eventId/tiers`, async ({ params, request }) => {
        const body = await request.json();
        return HttpResponse.json({
            success: true,
            data: {
                id: 'tier_new_001',
                eventId: params.eventId,
                name: body.name,
                price: body.price,
                rowPrefix: body.rowPrefix,
                rowCount: body.rowCount,
                seatsPerRow: body.seatsPerRow,
                totalCapacity: body.rowCount * body.seatsPerRow,
                availableCapacity: body.rowCount * body.seatsPerRow,
                createdAt: '2026-05-07T00:00:00',
            },
        }, { status: 201 });
    }),

    // Tiers for an event
    http.get(`${BASE_URL}/events/:eventId/tiers`, ({ params }) => {
        const tiers = MOCK_TIERS[params.eventId] ?? [];
        return HttpResponse.json({ success: true, data: tiers });
    }),

    // My tickets
    http.get(`${BASE_URL}/me/tickets`, () =>
        HttpResponse.json({ success: true, data: MOCK_TICKETS })
    ),

    // My bookings
    http.get(`${BASE_URL}/me/bookings`, () =>
        HttpResponse.json({ success: true, data: MOCK_MY_BOOKINGS })
    ),

    // Cancel a booking
    http.post(`${BASE_URL}/events/:eventId/bookings/:bookingId/cancel`, ({ params }) => {
        const booking = MOCK_MY_BOOKINGS.find((b) => b.id === params.bookingId);
        if (!booking) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({
            success: true,
            data: { ...booking, status: 'CANCELLED' },
        });
    }),

    // Create a booking
    http.post(`${BASE_URL}/events/:eventId/bookings`, async ({ params, request }) => {
        const body = await request.json();
        const tier = (MOCK_TIERS[params.eventId] ?? []).find((t) => t.id === body.tierId);
        const event = MOCK_EVENTS.find((e) => e.id === params.eventId);
        if (!tier || !event) {
            return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        }
        const tickets = Array.from({ length: body.quantity }, (_, i) => {
            const offset = (tier.totalCapacity - tier.availableCapacity) + i;
            const row = Math.floor(offset / tier.seatsPerRow) + 1;
            const seat = (offset % tier.seatsPerRow) + 1;
            return {
                id: `tk_${tier.id}_${i}`,
                bookingId: 'bk_001',
                tierId: tier.id,
                tierName: tier.name,
                eventId: event.id,
                eventTitle: event.title,
                seatNumber: `${tier.rowPrefix}${row}-${seat}`,
                qrCode: `QR-${tier.id}-${i}`,
                status: 'VALID',
                checkedInAt: null,
                issuedAt: '2026-05-01T00:00:00',
            };
        });
        return HttpResponse.json({
            success: true,
            data: {
                id: 'bk_001',
                eventId: event.id,
                eventTitle: event.title,
                tierId: tier.id,
                tierName: tier.name,
                quantity: body.quantity,
                totalAmount: Number(tier.price) * body.quantity,
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                paymentReference: 'sim_ref_001',
                createdAt: '2026-05-01T00:00:00',
                tickets,
            },
        }, { status: 201 });
    }),
);
