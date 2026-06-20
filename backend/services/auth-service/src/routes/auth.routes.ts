import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  verifyToken,
  changePassword, 
  changeEmail,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/verify', verifyToken);
router.patch('/password', changePassword);
router.patch('/email', changeEmail);

export default router;
