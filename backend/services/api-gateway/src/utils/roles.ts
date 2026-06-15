export type Role = 'user' | 'moderator' | 'admin';

export const ROLE_ORDER: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export const isRole = (value: unknown): value is Role =>
  value === 'user' || value === 'moderator' || value === 'admin';

export const hasMinimumRole = (role: Role, minimum: Role): boolean =>
  ROLE_ORDER[role] >= ROLE_ORDER[minimum];
