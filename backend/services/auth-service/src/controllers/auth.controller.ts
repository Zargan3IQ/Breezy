import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from '../config/db';

const JWT_SECRET             = process.env.JWT_SECRET             || 'secret';
const JWT_REFRESH_SECRET     = process.env.JWT_REFRESH_SECRET     || 'refresh_secret';
const JWT_EXPIRES_IN         = process.env.JWT_EXPIRES_IN         || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const USER_SERVICE_URL       = process.env.USER_SERVICE_URL       || 'http://user-service:3001';

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

    if (!response.ok) {
      return 'user';
    }

    const data = (await response.json()) as { role?: string };
    return typeof data.role === 'string' ? data.role : 'user';
  } catch {
    return 'user';
  }
};


export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ message: 'username, email and password are required' });
    return;
  }

  const existing = await prisma.authUser.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email already in use' });
    return;
  }

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.authUser.create({ data: { userId, email, passwordHash } });

  await fetch(`${USER_SERVICE_URL}/api/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, username, email, role: 'user' }),
  });

  const { accessToken, refreshToken } = generateTokens(userId, email, 'user');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({ data: { userId, token: refreshToken, expiresAt } });

  res.status(201).json({ accessToken, refreshToken, userId });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const user = await prisma.authUser.findUnique({ where: { email } });

  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
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

  res.status(200).json({ accessToken, refreshToken, userId: user.userId });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: 'refreshToken is required' });
    return;
  }

  const stored = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, expiresAt: { gt: new Date() } },
  });

  if (!stored) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { user_id: string };

    const user = await prisma.authUser.findUnique({
      where: { userId: decoded.user_id },
      select: { email: true},
    });

    const role = await fetchUserRole(decoded.user_id);
    const { accessToken } = generateTokens(decoded.user_id, user!.email, role);

    res.status(200).json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: 'refreshToken is required' });
    return;
  }

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

  res.status(200).json({ message: 'Logged out successfully' });
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ valid: true, payload: decoded });
  } catch {
    res.status(401).json({ valid: false, message: 'Invalid or expired token' });
  }
};
