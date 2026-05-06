import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:3000';

export const server = setupServer(
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
);
