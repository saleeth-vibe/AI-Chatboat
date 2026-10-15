import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generatePassword(length = 10): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

// Compared when no user row exists, so the response time stays close to a real check.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('campus-admin-dummy', env.bcryptRounds);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export function passwordsMatch(plain: string, passwordHash: string | undefined): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash ?? DUMMY_PASSWORD_HASH);
}
