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
        checkInStartTime: '2026-05-16T08:00:00',
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
        checkInStartTime: '2026-05-20T08:00:00',
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
        checkInStartTime: '2026-05-30T12:00:00',
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

export const MOCK_PENDING_EVENTS = [
    {
        id: 'evt_pending_001',
        title: 'Lagos Fintech Summit',
        description: 'Annual fintech summit.',
        venue: 'Federal Palace Hotel, Lagos',
        startTime: '2026-07-10T09:00:00',
        endTime: '2026-07-10T18:00:00',
        status: 'PENDING_APPROVAL',
        createdBy: 'user_010',
        rejectionReason: null,
        createdAt: '2026-05-01T00:00:00',
        updatedAt: '2026-05-01T00:00:00',
    },
    {
        id: 'evt_pending_002',
        title: 'Abuja Developer Conference',
        description: 'Tech conference.',
        venue: 'Transcorp Hilton, Abuja',
        startTime: '2026-08-05T10:00:00',
        endTime: '2026-08-05T19:00:00',
        status: 'PENDING_APPROVAL',
        createdBy: 'user_011',
        rejectionReason: null,
        createdAt: '2026-05-02T00:00:00',
        updatedAt: '2026-05-02T00:00:00',
    },
];

export const MOCK_EVENT_EDITS = [
    {
        id: 'eedit_001',
        eventId: 'evt_001',
        eventTitle: 'Moniepoint Merchant Summit 2026',
        organiserName: 'Jane Smith',
        organiserEmail: 'jane@example.com',
        status: 'PENDING',
        rejectionReason: null,
        submittedAt: '2026-05-09T09:15:00',
        proposedChanges: {
            description: 'An updated description with richer context about the 2026 summit — expanded networking sessions, new keynote speakers, and hands-on workshops for merchants.',
        },
        currentValues: {
            description: 'Annual merchant summit.',
        },
    },
    {
        id: 'eedit_002',
        eventId: 'evt_003',
        eventTitle: 'Partner Certification Day — Lagos',
        organiserName: 'Emeka Chukwu',
        organiserEmail: 'emeka@example.com',
        status: 'PENDING',
        rejectionReason: null,
        submittedAt: '2026-05-08T15:45:00',
        proposedChanges: {
            description: 'Certification programme updated with the new Q2 2026 curriculum. Attendees will leave with an industry-recognised certificate.',
        },
        currentValues: {
            description: 'Certification programme.',
        },
    },
    {
        id: 'eedit_003',
        eventId: 'evt_002',
        eventTitle: 'Agent Onboarding Workshop · Q2',
        organiserName: 'Locke Base',
        organiserEmail: 'locke@test.com',
        status: 'REJECTED',
        rejectionReason: 'The proposed description contains unverified claims about partner guarantees. Please revise.',
        submittedAt: '2026-05-07T11:00:00',
        proposedChanges: {
            description: 'Guaranteed certification for all attendees upon completion.',
        },
        currentValues: {
            description: 'Hands-on certification.',
        },
    },
];

export const MOCK_CHECKIN_INVITES = {
    evt_001: [
        { id: 'inv_001', name: 'David Okafor', email: 'david@staff.com', status: 'ACTIVE', expiresAt: '2026-05-17T18:00:00', lastUsedAt: '2026-05-16T10:30:00', createdAt: '2026-05-01T00:00:00', rawToken: null },
        { id: 'inv_002', name: 'Sarah Musa', email: 'sarah@staff.com', status: 'REVOKED', expiresAt: '2026-05-17T18:00:00', lastUsedAt: null, createdAt: '2026-05-02T00:00:00', rawToken: null },
    ],
};

export const MOCK_ORGANIZER_EVENTS = [
    {
        id: 'evt_001',
        title: 'Moniepoint Merchant Summit 2026',
        venue: 'Eko Convention Centre, Lagos',
        startTime: '2026-05-16T10:00:00',
        endTime: '2026-05-16T18:00:00',
        status: 'PUBLISHED',
        createdBy: 'user_001',
        rejectionReason: null,
        totalCapacity: 450,
        soldCount: 325,
        totalRevenue: 5375000,
        totalBookings: 124,
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-01T00:00:00',
    },
    {
        id: 'evt_org_pending',
        title: 'Lagos Fintech Summit',
        venue: 'Federal Palace Hotel, Lagos',
        startTime: '2026-07-10T09:00:00',
        endTime: '2026-07-10T18:00:00',
        status: 'PENDING_APPROVAL',
        createdBy: 'user_001',
        rejectionReason: null,
        totalCapacity: 300,
        soldCount: 0,
        totalRevenue: 0,
        totalBookings: 0,
        createdAt: '2026-05-01T00:00:00',
        updatedAt: '2026-05-01T00:00:00',
    },
    {
        id: 'evt_org_draft',
        title: 'EventNest Product Launch 2026',
        venue: 'Four Points by Sheraton, Lagos',
        startTime: '2026-09-15T10:00:00',
        endTime: '2026-09-15T18:00:00',
        status: 'DRAFT',
        createdBy: 'user_001',
        rejectionReason: null,
        totalCapacity: 200,
        soldCount: 0,
        totalRevenue: 0,
        totalBookings: 0,
        createdAt: '2026-05-03T00:00:00',
        updatedAt: '2026-05-03T00:00:00',
    },
    {
        id: 'evt_org_rejected',
        title: 'Abuja Developer Conference',
        venue: 'Transcorp Hilton, Abuja',
        startTime: '2026-08-05T10:00:00',
        endTime: '2026-08-05T19:00:00',
        status: 'DRAFT',
        createdBy: 'user_001',
        rejectionReason: 'Event details are incomplete. Please provide a full description and confirm venue availability before resubmitting.',
        totalCapacity: 0,
        soldCount: 0,
        totalRevenue: 0,
        totalBookings: 0,
        createdAt: '2026-05-02T00:00:00',
        updatedAt: '2026-05-06T00:00:00',
    },
];

export const MOCK_EVENT_BOOKINGS = {
    evt_001: [
        { id: 'bk_101', attendeeName: 'Adaeze Okonkwo', attendeeEmail: 'adaeze@example.com', tierName: 'VIP Front Row', quantity: 2, totalAmount: 150000, status: 'CONFIRMED', createdAt: '2026-05-01T10:00:00' },
        { id: 'bk_102', attendeeName: 'Emeka Chukwu', attendeeEmail: 'emeka@example.com', tierName: 'General Admission', quantity: 3, totalAmount: 75000, status: 'CONFIRMED', createdAt: '2026-05-02T09:00:00' },
        { id: 'bk_103', attendeeName: 'Fatima Bello', attendeeEmail: 'fatima@example.com', tierName: 'General Admission', quantity: 1, totalAmount: 25000, status: 'CANCELLED', createdAt: '2026-05-03T11:00:00' },
        { id: 'bk_104', attendeeName: 'Chidi Okeke', attendeeEmail: 'chidi@example.com', tierName: 'VIP Front Row', quantity: 1, totalAmount: 75000, status: 'CONFIRMED', createdAt: '2026-05-04T14:00:00' },
        { id: 'bk_105', attendeeName: 'Ngozi Eze', attendeeEmail: 'ngozi@example.com', tierName: 'General Admission', quantity: 5, totalAmount: 125000, status: 'CONFIRMED', createdAt: '2026-05-05T08:00:00' },
    ],
};

export const MOCK_COMMENTS = {
    evt_001: {
        content: [
            {
                id: 'cmt_001',
                parentCommentId: null,
                authorId: 'user_001',
                authorName: 'Base Locke',
                authorRoleOnEvent: 'ORGANIZER',
                body: 'Looking forward to this event!',
                deleted: false,
                editedAt: null,
                createdAt: '2026-05-16T09:00:00',
                likeCount: 3,
                replyCount: 1,
                replies: [],
            },
            {
                id: 'cmt_002',
                parentCommentId: null,
                authorId: 'user_002',
                authorName: 'Emeka Okafor',
                authorRoleOnEvent: null,
                body: 'Just convinced my whole team to get tickets!',
                deleted: false,
                editedAt: null,
                createdAt: '2026-05-15T14:00:00',
                likeCount: 0,
                replyCount: 0,
                replies: [],
            },
        ],
        totalElements: 2,
        totalPages: 1,
    },
};

export const MOCK_REPLIES = {
    cmt_001: [
        {
            id: 'rpl_001',
            parentCommentId: 'cmt_001',
            authorId: 'user_003',
            authorName: 'Fatima Bello',
            authorRoleOnEvent: null,
            body: 'Same here! Already bought mine.',
            deleted: false,
            editedAt: null,
            createdAt: '2026-05-16T10:00:00',
            likeCount: 1,
            replies: [],
        },
    ],
};

export const MOCK_ANALYTICS = {
    eventsByStatus: { DRAFT: 3, PENDING_APPROVAL: 2, PUBLISHED: 5, CANCELLED: 1 },
    totalBookings: 42,
    totalRevenue: 1850000,
    checkInRate: 0.68,
};

export const MOCK_REPORTS = [
    {
        id: 'rpt_001',
        eventId: 'evt_001',
        eventTitle: 'Moniepoint Merchant Summit 2026',
        eventStatus: 'PUBLISHED',
        reportedById: 'user_002',
        reportedByName: 'Jane Smith',
        reportedByEmail: 'jane@example.com',
        reason: 'FRAUD',
        description: 'Ticket prices were changed after purchase without notice.',
        status: 'PENDING',
        adminNote: null,
        reportedAt: '2026-05-10T12:00:00',
        reviewedAt: null,
    },
    {
        id: 'rpt_002',
        eventId: 'evt_002',
        eventTitle: 'Agent Onboarding Workshop · Q2',
        eventStatus: 'PUBLISHED',
        reportedById: 'user_001',
        reportedByName: 'John Doe',
        reportedByEmail: 'john@example.com',
        reason: 'SPAM',
        description: 'This event is a duplicate of an existing one.',
        status: 'REVIEWED',
        adminNote: 'Investigated — legitimate event.',
        reportedAt: '2026-05-08T09:30:00',
        reviewedAt: '2026-05-09T11:00:00',
    },
];

export const MOCK_ADMIN_USERS = [
    { id: 'user_001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'ATTENDEE', enabled: true, createdAt: '2026-01-01T00:00:00' },
    { id: 'user_002', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'ORGANISER', enabled: true, createdAt: '2026-01-02T00:00:00' },
    { id: 'user_admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'ADMIN', enabled: true, createdAt: '2026-01-01T00:00:00' },
];

// Prices are in kobo (NGN × 100), matching the production API contract.
export const MOCK_TIERS = {
    evt_001: [
        { id: 't1', eventId: 'evt_001', name: 'VIP Front Row', price: 7_500_000, rowPrefix: 'VIP', rowCount: 5, seatsPerRow: 10, totalCapacity: 50, availableCapacity: 12, createdAt: '2026-01-01T00:00:00' },
        { id: 't2', eventId: 'evt_001', name: 'General Admission', price: 2_500_000, rowPrefix: 'GEN', rowCount: 20, seatsPerRow: 20, totalCapacity: 400, availableCapacity: 113, createdAt: '2026-01-01T00:00:00' },
    ],
    evt_002: [
        { id: 't3', eventId: 'evt_002', name: 'Standard', price: 0, rowPrefix: 'A', rowCount: 15, seatsPerRow: 10, totalCapacity: 150, availableCapacity: 8, createdAt: '2026-01-02T00:00:00' },
    ],
    evt_003: [
        { id: 't4', eventId: 'evt_003', name: 'Certificate Track', price: 3_500_000, rowPrefix: 'C', rowCount: 8, seatsPerRow: 10, totalCapacity: 80, availableCapacity: 32, createdAt: '2026-01-03T00:00:00' },
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

    // Single event by slug — page hits this when the URL param is not a UUID.
    http.get(`${BASE_URL}/events/slug/:slug`, ({ params }) => {
        const event = MOCK_EVENTS.find(e => e.slug === params.slug || e.id === params.slug);
        if (!event) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: event });
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

    // Update a tier
    http.patch(`${BASE_URL}/events/:eventId/tiers/:tierId`, async ({ params, request }) => {
        const body = await request.json();
        const tier = (MOCK_TIERS[params.eventId] ?? []).find((t) => t.id === params.tierId);
        if (!tier) return HttpResponse.json({ success: false, message: 'Tier not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: { ...tier, ...body } });
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

    // Admin: events by status or organiserId
    http.get(`${BASE_URL}/admin/events`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const organiserId = url.searchParams.get('organiserId');
        let events = [...MOCK_EVENTS];
        if (organiserId) events = events.filter(e => e.createdBy === organiserId);
        else if (status) events = MOCK_EVENTS.filter(e => e.status === status);
        return HttpResponse.json({
            success: true,
            data: { content: events, page: 0, size: 20, totalElements: events.length, totalPages: 1 },
        });
    }),

    // Admin: single event detail (tiers + organizer embedded)
    http.get(`${BASE_URL}/admin/events/:id`, ({ params }) => {
        const event = [...MOCK_EVENTS, ...MOCK_ORGANIZER_EVENTS]
            .find((e) => e.id === params.id);
        if (!event) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });

        const tiers = MOCK_TIERS[params.id] ?? [];
        const organiserUser = MOCK_ADMIN_USERS.find((u) => u.id === event.createdBy) ?? null;
        const organizer = organiserUser
            ? { id: organiserUser.id, firstName: organiserUser.firstName, lastName: organiserUser.lastName, email: organiserUser.email }
            : null;

        return HttpResponse.json({ success: true, data: { ...event, tiers, organizer } });
    }),

    // Admin: bookings for a specific event
    http.get(`${BASE_URL}/admin/events/:id/bookings`, ({ params }) => {
        const bookings = MOCK_EVENT_BOOKINGS[params.id] ?? [];
        return HttpResponse.json({
            success: true,
            data: { content: bookings, totalElements: bookings.length },
        });
    }),

    // Admin: users
    http.get(`${BASE_URL}/admin/users`, () =>
        HttpResponse.json({
            success: true,
            data: { content: MOCK_ADMIN_USERS, page: 0, size: 20, totalElements: MOCK_ADMIN_USERS.length, totalPages: 1 },
        })
    ),

    // Admin: single user
    http.get(`${BASE_URL}/admin/users/:id`, ({ params }) => {
        const user = MOCK_ADMIN_USERS.find((u) => u.id === params.id);
        if (!user) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: user });
    }),

    // Admin: enable user
    http.patch(`${BASE_URL}/admin/users/:id/enable`, ({ params }) => {
        const user = MOCK_ADMIN_USERS.find((u) => u.id === params.id) ?? { id: params.id };
        return HttpResponse.json({ success: true, data: { ...user, enabled: true } });
    }),

    // Admin: disable user
    http.patch(`${BASE_URL}/admin/users/:id/disable`, ({ params }) => {
        const user = MOCK_ADMIN_USERS.find((u) => u.id === params.id) ?? { id: params.id };
        return HttpResponse.json({ success: true, data: { ...user, enabled: false } });
    }),

    // Admin: force cancel / unpublish event
    http.patch(`${BASE_URL}/admin/events/:id/cancel`, ({ params }) =>
        HttpResponse.json({ success: true, message: 'Event cancelled', data: { id: params.id, status: 'CANCELLED' } })
    ),

    // Admin: list event reports
    http.get(`${BASE_URL}/admin/reports`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') ?? 'PENDING';
        const reports = MOCK_REPORTS.filter((r) => r.status === status);
        return HttpResponse.json({
            success: true,
            data: { content: reports, page: 0, size: 20, totalElements: reports.length, totalPages: 1 },
        });
    }),

    // Admin: review a report
    http.patch(`${BASE_URL}/admin/reports/:id/review`, async ({ params, request }) => {
        const body = await request.json();
        const report = MOCK_REPORTS.find((r) => r.id === params.id);
        return HttpResponse.json({
            success: true,
            data: { ...report, status: body.action, adminNote: body.adminNote ?? null, reviewedAt: new Date().toISOString() },
        });
    }),

    // User: submit event report
    http.post(`${BASE_URL}/events/:eventId/report`, async ({ params, request }) => {
        const body = await request.json();
        return HttpResponse.json({
            success: true,
            message: 'Report submitted successfully',
            data: {
                id: `rpt_new_${Date.now()}`,
                eventId: params.eventId,
                reason: body.reason,
                description: body.description ?? null,
                status: 'PENDING',
                reportedAt: new Date().toISOString(),
            },
        }, { status: 201 });
    }),

    // Admin: analytics
    http.get(`${BASE_URL}/admin/analytics`, () =>
        HttpResponse.json({ success: true, data: MOCK_ANALYTICS })
    ),

    // Organizer: my events
    http.get(`${BASE_URL}/organizer/events`, () =>
        HttpResponse.json({ success: true, data: MOCK_ORGANIZER_EVENTS })
    ),

    // Organizer: single event (any status, 403 if not owner — mock always succeeds)
    http.get(`${BASE_URL}/organizer/events/:id`, ({ params }) => {
        const event =
            MOCK_ORGANIZER_EVENTS.find((e) => e.id === params.id) ??
            MOCK_EVENTS.find((e) => e.id === params.id);
        if (!event) return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
        return HttpResponse.json({ success: true, data: event });
    }),

    // Organizer: bookings for an event
    http.get(`${BASE_URL}/organizer/events/:eventId/bookings`, ({ params }) =>
        HttpResponse.json({
            success: true,
            data: {
                content: MOCK_EVENT_BOOKINGS[params.eventId] ?? [],
                totalElements: (MOCK_EVENT_BOOKINGS[params.eventId] ?? []).length,
            },
        })
    ),

    // Delete event
    http.delete(`${BASE_URL}/events/:id`, () =>
        HttpResponse.json({ success: true, message: 'Event deleted' })
    ),

    // Comments: list for an event (paged)
    http.get(`${BASE_URL}/events/:eventId/comments`, ({ params }) => {
        const data = MOCK_COMMENTS[params.eventId] ?? { content: [], totalElements: 0, totalPages: 0 };
        return HttpResponse.json({ success: true, data });
    }),

    // Comments: post (top-level or reply)
    http.post(`${BASE_URL}/events/:eventId/comments`, async ({ params, request }) => {
        const body = await request.json();
        return HttpResponse.json({
            success: true,
            data: {
                id: 'cmt_new',
                parentCommentId: body.parentCommentId ?? null,
                authorId: 'user_001',
                authorName: 'Base Locke',
                authorRoleOnEvent: 'ORGANIZER',
                body: body.body,
                deleted: false,
                editedAt: null,
                createdAt: new Date().toISOString(),
                likeCount: 0,
                replyCount: 0,
                replies: [],
            },
        }, { status: 201 });
    }),

    // Comments: get replies for a single comment
    http.get(`${BASE_URL}/comments/:commentId/replies`, ({ params }) => {
        const data = MOCK_REPLIES[params.commentId] ?? [];
        return HttpResponse.json({ success: true, data });
    }),

    // Comments: update (edit body)
    http.patch(`${BASE_URL}/comments/:commentId`, async ({ params, request }) => {
        const body = await request.json();
        return HttpResponse.json({
            success: true,
            data: {
                id: params.commentId,
                body: body.body,
                deleted: false,
                editedAt: new Date().toISOString(),
                likeCount: 0,
                replies: [],
            },
        });
    }),

    // Comments: soft-delete
    http.delete(`${BASE_URL}/comments/:commentId`, ({ params }) =>
        HttpResponse.json({
            success: true,
            data: { id: params.commentId, deleted: true, body: '[Comment removed]' },
        })
    ),

    // Comments: toggle like
    http.post(`${BASE_URL}/comments/:commentId/like`, ({ params }) =>
        HttpResponse.json({
            success: true,
            data: { commentId: params.commentId, type: 'LIKE', reacted: true, likeCount: 1 },
        })
    ),

    // Check-in: scan a ticket
    http.post(`${BASE_URL}/events/:eventId/checkin`, async ({ params, request }) => {
        const body = await request.json();
        if (!body.staffToken || body.staffToken !== 'ckin_demo_token') {
            return HttpResponse.json({ success: false, message: 'Invalid or expired staff token' }, { status: 401 });
        }
        const ticket = MOCK_TICKETS.find((t) => t.qrCode === body.qrCode && t.eventId === params.eventId);
        if (!ticket) {
            return HttpResponse.json({ success: false, message: 'Ticket not found or does not belong to this event' }, { status: 404 });
        }
        if (ticket.status === 'USED') {
            return HttpResponse.json({ success: false, message: 'Ticket has already been checked in' }, { status: 409 });
        }
        if (ticket.status === 'REFUNDED') {
            return HttpResponse.json({ success: false, message: 'Ticket has been refunded and is no longer valid' }, { status: 409 });
        }
        return HttpResponse.json({
            success: true,
            message: 'Check-in successful',
            data: {
                ticketId: ticket.id,
                seatNumber: ticket.seatNumber,
                tierName: ticket.tierName,
                eventId: ticket.eventId,
                eventTitle: ticket.eventTitle,
                attendeeFirstName: 'Adaeze',
                attendeeLastName: 'Okonkwo',
                checkedInAt: new Date().toISOString(),
                checkedInByLabel: 'David Okafor',
            },
        });
    }),

    // Check-in: list invites
    http.get(`${BASE_URL}/events/:eventId/checkin/invites`, ({ params }) =>
        HttpResponse.json({
            success: true,
            data: MOCK_CHECKIN_INVITES[params.eventId] ?? [],
        })
    ),

    // Check-in: create invite
    http.post(`${BASE_URL}/events/:eventId/checkin/invites`, async ({ params, request }) => {
        const body = await request.json();
        const rawToken = 'ckin_demo_token';
        const invite = {
            id: `inv_${Date.now()}`,
            name: body.name,
            email: body.email,
            status: 'ACTIVE',
            expiresAt: '2026-05-17T18:00:00',
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            rawToken,
        };
        return HttpResponse.json({ success: true, message: 'Check-in invite created. Save the token — it will not be shown again.', data: invite }, { status: 201 });
    }),

    // Check-in: revoke invite
    http.delete(`${BASE_URL}/events/:eventId/checkin/invites/:inviteId`, () =>
        HttpResponse.json({ success: true, message: 'Check-in invite revoked' })
    ),
);
