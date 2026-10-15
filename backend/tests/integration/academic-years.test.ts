import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const configured = existsSync('.env') && Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER);

describe('academic year endpoints', () => {
  let baseUrl = '';
  let server: Server | undefined;
  let ready = false;
  let cookie = '';
  const suffix = Date.now().toString().slice(-6);
  const adminEmail = `p2-admin-${suffix}@university.test`;
  const nameA = `p2a${suffix}`;
  const nameB = `p2b${suffix}`;

  before(async () => {
    if (!configured) {
      return;
    }

    const { sequelize } = await import('../../src/database/connection');
    try {
      await sequelize.authenticate();
    } catch {
      return;
    }

    const { User } = await import('../../src/models');
    const passwordHash = await bcrypt.hash('test-password-1', 10);
    await User.unscoped().create({
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });

    const { createApp } = await import('../../src/app');
    server = createApp().listen(0);
    await new Promise<void>((resolve) => {
      server?.once('listening', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'test-password-1' }),
    });
    const setCookie = loginResponse.headers.getSetCookie().find((value) => value.startsWith('campus_token='));
    cookie = setCookie?.split(';')[0] ?? '';
    ready = loginResponse.status === 200 && cookie.length > 0;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (!configured) {
      return;
    }

    const { sequelize } = await import('../../src/database/connection');
    if (ready) {
      const { AcademicYear, User } = await import('../../src/models');
      await AcademicYear.destroy({ where: { name: [nameA, nameB] } });
      await User.unscoped().destroy({ where: { email: adminEmail } });
    }
    await sequelize.close();
  });

  it('requires an admin session', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    const response = await fetch(`${baseUrl}/academic-years`);
    assert.equal(response.status, 401);
  });

  it('creates a year, rejects an overlap and a duplicate name, and updates the year', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    const created = await request('/academic-years', {
      method: 'POST',
      body: JSON.stringify({
        name: nameA,
        startDate: '2091-08-01',
        endDate: '2092-07-31',
      }),
    });
    assert.equal(created.status, 201);
    const createdBody = (await created.json()) as { id: number; name: string; isActive: boolean };
    assert.equal(createdBody.name, nameA);
    assert.equal(createdBody.isActive, true);
    assert.equal(JSON.stringify(createdBody).includes('password'), false);

    const overlap = await request('/academic-years', {
      method: 'POST',
      body: JSON.stringify({
        name: nameB,
        startDate: '2092-07-31',
        endDate: '2093-07-31',
      }),
    });
    assert.equal(overlap.status, 409);

    const adjacent = await request('/academic-years', {
      method: 'POST',
      body: JSON.stringify({
        name: nameB,
        startDate: '2092-08-01',
        endDate: '2093-07-31',
      }),
    });
    assert.equal(adjacent.status, 201);

    const duplicate = await request('/academic-years', {
      method: 'POST',
      body: JSON.stringify({
        name: nameA,
        startDate: '2094-08-01',
        endDate: '2095-07-31',
      }),
    });
    assert.equal(duplicate.status, 409);

    const listed = await request(`/academic-years?search=${nameA}`);
    const listBody = (await listed.json()) as { data: Array<{ name: string }>; meta: { total: number } };
    assert.equal(listed.status, 200);
    assert.equal(listBody.meta.total, 1);
    assert.equal(listBody.data[0]?.name, nameA);

    const updated = await request(`/academic-years/${createdBody.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
    const updatedBody = (await updated.json()) as { isActive: boolean };
    assert.equal(updated.status, 200);
    assert.equal(updatedBody.isActive, false);
  });

  function request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('cookie', cookie);
    if (options.body) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  }
});
