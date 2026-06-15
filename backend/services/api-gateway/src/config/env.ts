import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 8080;
export const JWT_SECRET = process.env.JWT_SECRET || 'secret';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const SERVICE_TARGETS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:5000',
  user: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  post: process.env.POST_SERVICE_URL || 'http://post-service:3003',
  profile: process.env.PROFILE_SERVICE_URL || 'http://profile-service:3004',
} as const;

export type ServiceName = keyof typeof SERVICE_TARGETS;
