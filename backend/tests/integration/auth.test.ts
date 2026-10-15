import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const configured = existsSync('.env') && Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER);

describe('auth endpoints', () => {
  let baseUrl = '';
  let server: Server | undefined;
  let ready = false;
  const password = 'test-password-1';
  const adminEmail = `phase1-admin-${Date.now()}@university.test`;
  const studentEmail = `phase1-student-${Date.now()}@university.test`;
  const inactiveEmail = `phase1-inactive-${Date.now()}@university.test`;

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
    const passwordHash = await bcrypt.hash(password, 10);
    await User.unscoped().bulkCreate([
      { email: adminEmail, passwordHash, role: 'ADMIN', isActive: true },
      { email: studentEmail, passwordHash, role: 'STUDENT', isActive: true },
      { email: inactiveEmail, passwordHash, role: 'ADMIN', isActive: false },
    ]);

    const { createApp } = await import('../../src/app');
    server = createApp().listen(0);
    await new Promise<void>((resolve) => {
      server?.once('listening', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
    ready = true;
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
      const { User } = await import('../../src/models');
      await User.unscoped().destroy({
        where: { email: [adminEmail, studentEmail, inactiveEmail] },
      });
    }
    await sequelize.close();
  });

  it('reports health without a session', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('rejects an unknown user, a wrong password, and an inactive user with the same message', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    for (const body of [
      { email: 'missing@university.test', password },
      { email: adminEmail, password: 'wrong-password' },
      { email: inactiveEmail, password },
    ]) {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      assert.equal(response.status, 401);
      assert.equal(payload.error?.message, 'Invalid email or password');
      assert.equal(JSON.stringify(payload).includes('password_hash'), false);
    }
  });

  it('sets an httpOnly cookie for an admin and blocks a student from the admin session', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    const loginBody = (await loginResponse.json()) as { user?: { email?: string; role?: string; passwordHash?: string } };
    const cookie = sessionCookie(loginResponse);

    assert.equal(loginResponse.status, 200);
    assert.equal(loginBody.user?.email, adminEmail);
    assert.equal(loginBody.user?.role, 'ADMIN');
    assert.equal(loginBody.user?.passwordHash, undefined);
    assert.match(cookie, /campus_token=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const meResponse = await fetch(`${baseUrl}/auth/me`, { headers: { cookie: cookiePair(cookie) } });
    assert.equal(meResponse.status, 200);

    const studentLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password }),
    });
    const studentCookie = sessionCookie(studentLogin);
    const studentMe = await fetch(`${baseUrl}/auth/me`, { headers: { cookie: cookiePair(studentCookie) } });
    const studentBody = (await studentMe.json()) as { user?: { role?: string } };
    assert.equal(studentMe.status, 200);
    assert.equal(studentBody.user?.role, 'STUDENT');

    const studentDashboard = await fetch(`${baseUrl}/dashboard`, { headers: { cookie: cookiePair(studentCookie) } });
    assert.equal(studentDashboard.status, 403);

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { cookie: cookiePair(cookie) },
    });
    const cleared = logoutResponse.headers.getSetCookie().join(';');
    assert.equal(logoutResponse.status, 200);
    assert.match(cleared, /campus_token=/);

    const afterLogout = await fetch(`${baseUrl}/auth/me`);
    assert.equal(afterLogout.status, 401);
  });
});

function sessionCookie(response: Response): string {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith('campus_token='));
  assert.ok(cookie);
  return cookie;
}

function cookiePair(setCookie: string): string {
  return setCookie.split(';')[0] ?? '';
}
