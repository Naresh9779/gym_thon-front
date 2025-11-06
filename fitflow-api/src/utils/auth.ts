import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN } as any);
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN } as any);
}

export function verifyAccessToken(token: string): { userId: string; role: string } {
  return jwt.verify(token, ENV.JWT_SECRET) as { userId: string; role: string };
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { userId: string };
}
