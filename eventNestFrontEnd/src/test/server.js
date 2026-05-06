import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
    http.post('/auth/login', () =>
        HttpResponse.json({ token: 'fake-token', user: { id: 1, email: 'a@b.com' } })
    ),
    http.post('/auth/register', () =>
        HttpResponse.json({ id: 1, email: 'a@b.com' })
    ),
);
