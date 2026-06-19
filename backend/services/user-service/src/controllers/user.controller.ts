import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';

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
  const { language_preference, theme_preference, username, avatar_url, email } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        languagePreference: language_preference ?? undefined,
        themePreference: theme_preference ?? undefined,
        username: username ?? undefined,
        avatarUrl: avatar_url ?? undefined,
        email: email ?? undefined,
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

// export const setBanStatus = async (req: Request<{ id: string }>, res: Response) => {
//   const { id } = req.params;
//   const { is_banned } = req.body;

//   if (typeof is_banned !== 'boolean') {
//     return res.status(400).json({ message: 'The is_banned field must be a boolean.' });
//   }

//   try {
//     const user = await prisma.user.update({
//       where: { id },
//       data: { isBanned: is_banned },
//     });
//     return res.status(200).json(user);
//   } catch (error) {
//     if ((error as { code?: string }).code === 'P2025') {
//       throw new AppError(404, 'User not found.');
//     }
//     throw new AppError(500, (error as Error).message);
//   }
// };

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
        isBanned: false,
      },
      select: { id: true, username: true },
      take: 20,
    });

    return res.status(200).json(users);

};
