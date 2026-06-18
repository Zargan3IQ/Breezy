import { Router } from 'express';
import {
  createUserInfos,
  getPublicUserSummary,
  getPublicUserSummaryByUsername,
  getUserInfos,
  updateUserInfos,
  deleteUserInfos,
  //setBanStatus,
  updateUserRole,
} from '../controllers/user.controller';

const router = Router();

router.post('/', createUserInfos);
router.get('/username/:username/public', getPublicUserSummaryByUsername);
router.get('/:id/public', getPublicUserSummary);
router.get('/:id', getUserInfos);
router.put('/:id', updateUserInfos);
router.delete('/:id', deleteUserInfos);
//router.patch('/:id/ban', setBanStatus);
router.patch('/:id/role', updateUserRole);

export default router;
