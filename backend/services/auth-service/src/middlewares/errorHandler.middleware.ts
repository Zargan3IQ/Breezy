import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: err.message || 'Internal server error' });
};
