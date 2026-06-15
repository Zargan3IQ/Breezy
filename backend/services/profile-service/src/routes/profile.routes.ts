import { Router } from 'express';
import {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
} from '../controllers/profile.controller';

const router = Router();

router.post('/', createProfile);
router.get('/:userId', getProfile);
router.put('/:userId', updateProfile);
router.delete('/:userId', deleteProfile);

export default router;
