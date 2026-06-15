import { NextFunction, Request, Response } from 'express';
import { Role } from '../utils/roles';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};

export const requireSelfOrRole = (paramName: string, ...bypassRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const isSelf = req.params[paramName] === req.user.id;
    const isBypassed = bypassRoles.includes(req.user.role);

    if (!isSelf && !isBypassed) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};
