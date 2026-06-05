import { Router } from 'express';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  setBanStatus,
  updateUserRole,
} from '../controllers/user.controller';

const router = Router();

router.post('/', createUserProfile);
router.get('/:id', getUserProfile);
router.put('/:id', updateUserProfile);
router.delete('/:id', deleteUserProfile);
router.patch('/:id/ban', setBanStatus);
router.patch('/:id/role', updateUserRole);

export default router;
