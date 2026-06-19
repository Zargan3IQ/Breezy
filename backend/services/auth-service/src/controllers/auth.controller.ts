import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { isValidEmail, getPasswordIssues, isValidUsername } from '../utils/validators';
import { AppError } from '../utils/AppError';


const JWT_SECRET             = process.env.JWT_SECRET             || 'secret';
const JWT_REFRESH_SECRET     = process.env.JWT_REFRESH_SECRET     || 'refresh_secret';
const JWT_EXPIRES_IN         = process.env.JWT_EXPIRES_IN         || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const USER_SERVICE_URL       = process.env.USER_SERVICE_URL       || 'http://user-service:3001';
const PROFILE_SERVICE_URL    = process.env.PROFILE_SERVICE_URL    || 'http://profile-service:3004';
const IS_PROD                = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_MAX_AGE  = 15 * 60 * 1000;           // 15 min in ms
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: IS_PROD,
  path: '/',
};

const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { user_id: userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
  const refreshToken = jwt.sign(
    { user_id: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
  return { accessToken, refreshToken };
};

const fetchUserRole = async (userId: string): Promise<string> => {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/api/users/${userId}`);
    if (!response.ok) return 'user';
    const data = (await response.json()) as { role?: string };
    return typeof data.role === 'string' ? data.role : 'user';
  } catch {
    return 'user';
  }
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('breezy_access', accessToken, {
    ...COOKIE_BASE,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  res.cookie('breezy_refresh', refreshToken, {
    ...COOKIE_BASE,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('breezy_access', COOKIE_BASE);
  res.clearCookie('breezy_refresh', COOKIE_BASE);
};

const rollbackRegisteredUser = async (userId: string) => {
  await prisma.authUser.delete({ where: { userId } }).catch(() => {});

  try {
    await fetch(`${USER_SERVICE_URL}/api/users/${userId}`, { method: 'DELETE' });
  } catch {
    // Best-effort cleanup only.
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError(400, 'username, email and password are required');
  }

    if (!isValidUsername(username)) {
    throw new AppError(400, 'Username must be 3-30 characters (letters, digits, "_", ".").');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError(400, 'Invalid email format.');
  }

  const passwordIssues = getPasswordIssues(password);
  if (passwordIssues.length > 0) {
    throw new AppError(400, 'Password does not meet security requirements.');
  }

  const existing = await prisma.authUser.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError(409, 'Email already in use');
  }

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.authUser.create({ data: { userId, email: normalizedEmail, passwordHash } });

  const userRes = await fetch(`${USER_SERVICE_URL}/api/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, username, email: normalizedEmail, role: 'user' }),
  });

    if (!userRes.ok) {
      const body = await userRes.text();
      console.error(`[auth] user-service rejected user creation: ${userRes.status} ${body}`);
      await rollbackRegisteredUser(userId);
      throw new AppError(502, 'Failed to create user profile');
    }

    const profileRes = await fetch(`${PROFILE_SERVICE_URL}/api/profile/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!profileRes.ok) {
      const body = await profileRes.text();
      console.error(`[auth] profile-service rejected profile creation: ${profileRes.status} ${body}`);
      await rollbackRegisteredUser(userId);
      throw new AppError(502, 'Failed to initialize user profile');
    }
 
  const { accessToken, refreshToken } = generateTokens(userId, normalizedEmail, 'user');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({ data: { userId, token: refreshToken, expiresAt } });

  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ userId });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'email and password are required');
  }

  const user = await prisma.authUser.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  await prisma.authUser.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
  });

  const role = await fetchUserRole(user.userId);
  const { accessToken, refreshToken } = generateTokens(user.userId, user.email, role);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { userId: user.userId, token: refreshToken, expiresAt },
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ userId: user.userId });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  // Accept cookie (primary) or body (fallback for non-browser clients)
  const refreshToken = req.cookies?.breezy_refresh ?? req.body?.refreshToken;

  if (!refreshToken) {
    throw new AppError(400, 'Refresh token not found');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, expiresAt: { gt: new Date() } },
  });

  if (!stored) {
    clearAuthCookies(res);
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { user_id: string };

    const user = await prisma.authUser.findUnique({
      where: { userId: decoded.user_id },
      select: { email: true },
    });

    const role = await fetchUserRole(decoded.user_id);
    const { accessToken } = generateTokens(decoded.user_id, user!.email, role);

    res.cookie('breezy_access', accessToken, {
      ...COOKIE_BASE,
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });

    res.status(200).json({ ok: true });
  } catch {
    clearAuthCookies(res);
    throw new AppError(401, 'Invalid refresh token');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.breezy_refresh ?? req.body?.refreshToken;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out successfully' });
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'No token provided');
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ valid: true, payload: decoded });
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
};
