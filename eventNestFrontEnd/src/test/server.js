import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:3000';

export const server = setupServer(
    http.post(`${BASE_URL}/auth/login`, () =>
        HttpResponse.json({ token: 'fake-token', user: { id: 1, email: 'a@b.com' } })
    ),
    http.post(`${BASE_URL}/auth/register`, () =>
        HttpResponse.json({ id: 1, email: 'a@b.com' })
    ),
    http.post(`${BASE_URL}/social-auth/`, () =>
        HttpResponse.json({ token: 'fake-social-token', user: { id: 2, email: 'google@example.com' } })
    ),
);
