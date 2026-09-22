import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { api } from './helpers';
import { config } from '../../../server/config.js';

describe('interactive API docs (/api/docs)', () => {
  it('serves Swagger UI when docs are enabled', async () => {
    const res = await api<string>('/api/docs');
    expect(res.status).toBe(200);
    expect(res.data).toContain('Swagger UI');
  });

  it('is absent (404) when docs are disabled in production', async () => {
    (config as { enableApiDocs: boolean }).enableApiDocs = false;
    try {
      const { default: prodApp } = await import(
        /* @vite-ignore */ `../../../server/app.js?test=prod-disabled-${Date.now()}`
      );

      const server = await new Promise<import('node:http').Server>((resolve, reject) => {
        const s = prodApp.listen(0, '127.0.0.1', () => resolve(s));
        s.on('error', reject);
      });
      const { port } = server.address() as AddressInfo;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/docs`);
        expect(res.status).toBe(404);
      } finally {
        server.close();
      }
    } finally {
      (config as { enableApiDocs: boolean }).enableApiDocs = true;
    }
  });
});