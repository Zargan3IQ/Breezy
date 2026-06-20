import { Router } from 'express';
import {
  createUserInfos,
  getPublicUserSummary,
  getPublicUserSummaryByUsername,
  getUserInfos,
  updateUserInfos,
  deleteUserInfos,
  updateUserRole,
  searchUsers,  
  suspendUser,
  banUser,
  reinstateUser,
} from '../controllers/user.controller';

const router = Router();

router.post('/', createUserInfos);
router.get('/username/:username/public', getPublicUserSummaryByUsername);
router.get('/:id/public', getPublicUserSummary);
router.get('/:id', getUserInfos);
router.put('/:id', updateUserInfos);
router.delete('/:id', deleteUserInfos);
router.patch('/:id/role', updateUserRole);
router.get('/search', searchUsers); 
router.patch('/:id/suspend', suspendUser);
router.patch('/:id/ban', banUser);
router.patch('/:id/reinstate', reinstateUser);


export default router;
