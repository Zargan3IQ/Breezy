import { Router } from 'express';
import {
  likePost,
  unlikePost,
  getUserPostLikes,
  getPostLikers,
} from '../controllers/post-like.controller';

const router = Router();

router.post('/', likePost);
router.delete('/', unlikePost);
router.get('/user/:userId', getUserPostLikes);
router.get('/post/:postId', getPostLikers);

export default router;