import request from 'supertest';
import { expect, it } from 'vitest';

import { createApp } from './app.js';

const PUBLIC_APP_URL = 'http://localhost:5173';

it('returns a public liveness response with a request identifier', async () => {
    const response = await request(createApp({ publicAppUrl: PUBLIC_APP_URL })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
});

it('rejects a write request without the configured origin', async () => {
    const response = await request(createApp({ publicAppUrl: PUBLIC_APP_URL }))
      .post('/api/example')
      .send({ value: true });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ORIGIN_FORBIDDEN' } });
});

it('requires JSON on write requests from the configured origin', async () => {
    const response = await request(createApp({ publicAppUrl: PUBLIC_APP_URL }))
      .post('/api/example')
      .set('Origin', PUBLIC_APP_URL)
      .set('Content-Type', 'text/plain')
      .send('value');

    expect(response.status).toBe(415);
    expect(response.body).toMatchObject({ error: { code: 'INVALID_INPUT' } });
});

it('maps malformed JSON and oversized bodies to safe client errors', async () => {
    const app = createApp({ publicAppUrl: PUBLIC_APP_URL });
    const malformed = await request(app)
      .post('/api/example')
      .set('Origin', PUBLIC_APP_URL)
      .set('Content-Type', 'application/json')
      .send('{');
    const oversized = await request(app)
      .post('/api/example')
      .set('Origin', PUBLIC_APP_URL)
      .send({ value: 'x'.repeat(9000) });

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(oversized.body).toMatchObject({ error: { code: 'INVALID_INPUT' } });
});

it('hides unexpected handler errors from the response', async () => {
    const response = await request(createApp({
      healthHandler: (_request, _response, next) => next(new Error('private failure')),
      publicAppUrl: PUBLIC_APP_URL,
    })).get('/health');

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('private failure');
});

it('allows the configured origin through CORS preflight', async () => {
    const response = await request(createApp({ publicAppUrl: PUBLIC_APP_URL }))
      .options('/api/example')
      .set('Origin', PUBLIC_APP_URL)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBe(PUBLIC_APP_URL);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  expect(response.status).toBe(204);
});

it('prevents API responses from being cached or used as referrers', async () => {
  const response = await request(createApp({ publicAppUrl: PUBLIC_APP_URL })).get('/api/example');

  expect(response.headers['cache-control']).toBe('no-store');
  expect(response.headers['referrer-policy']).toBe('no-referrer');
});
