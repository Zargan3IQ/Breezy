import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { redis } from '../config/redis';

const VALID_ROLES = Object.values(Role);

export const createUserInfos = async (req: Request, res: Response) => {
  const { id, username, email, role } = req.body;

  if (!id || !username || !email) {
    throw new AppError(400, 'Required fields missing (id, username, email).');
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw new AppError(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
  }

    const user = await prisma.user.create({
      data: { id, username, email, role: role ?? 'user' },
    });
    return res.status(201).json(user);
};

export const getUserInfos = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return res.status(200).json(user);

};

export const getPublicUserSummary = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return res.status(200).json(user);

};

export const getPublicUserSummaryByUsername = async (req: Request<{ username: string }>, res: Response) => {
  const { username } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return res.status(200).json(user);
 
};

export const updateUserInfos = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { language_preference, theme_preference, username, avatar_url } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        languagePreference: language_preference ?? undefined,
        themePreference: theme_preference ?? undefined,
        username: username ?? undefined,
        avatarUrl: avatar_url ?? undefined,
      },
    });

    return res.status(200).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new AppError(404, 'User not found.');
    }
    throw error;
  }
};

export const deleteUserInfos = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new AppError(404, 'User not found.');
    }
    throw error;
  }
};

export const updateUserRole = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    throw new AppError(400, 'The role field is required.');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new AppError(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });
    return res.status(200).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new AppError(404, 'User not found.');
    }
    throw error;
  }
};

/**
 * Search users by username
 */
export const searchUsers = async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) throw new AppError(400, 'Query parameter "q" is required.');

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        status: 'active', 
      },
      select: { id: true, username: true },
      take: 20,
    });

    return res.status(200).json(users);

};

export const suspendUser = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { until, reason } = req.body;

  if (!until) throw new AppError(400, 'until (date de fin de suspension) is required.');
  const suspendedUntil = new Date(until);
  if (isNaN(suspendedUntil.getTime()) || suspendedUntil <= new Date()) {
    throw new AppError(400, 'until must be a valid future date.');
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'suspended', suspendedUntil, statusReason: reason ?? null },
    });
    const ttlSeconds = Math.ceil((suspendedUntil.getTime() - Date.now()) / 1000);
    await redis.set(`revoked:${id}`, Date.now().toString(), 'EX', ttlSeconds); 
    return res.status(200).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') throw new AppError(404, 'User not found.');
    throw error;
  }
};

export const banUser = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'banned', suspendedUntil: null, statusReason: reason ?? null },
    });
    await redis.set(`revoked:${id}`, Date.now().toString());
    return res.status(200).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') throw new AppError(404, 'User not found.');
    throw error;
  }
};

export const reinstateUser = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'active', suspendedUntil: null, statusReason: null },
    });
    await redis.del(`revoked:${id}`);
    return res.status(200).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') throw new AppError(404, 'User not found.');
    throw error;
  }
};

