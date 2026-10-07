import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const newToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, keyLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const [kind, salt, expected] = String(encoded).split('$');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  const actual = Buffer.from(await scrypt(password, salt, keyLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
  const wanted = Buffer.from(expected, 'base64url');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left), 'utf8');
  const b = Buffer.from(String(right), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCookies(header = '') {
  const cookies = new Map();
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}
