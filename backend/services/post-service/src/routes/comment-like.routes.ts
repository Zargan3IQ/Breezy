import { Router } from 'express';
import {
  likeComment,
  unlikeComment,
  getUserCommentLikes,
  getCommentLikers,
} from '../controllers/comment-like.controller';

const router = Router();

router.post('/', likeComment);
router.delete('/', unlikeComment);
router.get('/user/:userId', getUserCommentLikes);
router.get('/comment/:commentId', getCommentLikers);

export default router;
