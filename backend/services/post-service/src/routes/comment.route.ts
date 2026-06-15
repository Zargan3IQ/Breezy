import { Router } from 'express';
import {
  createComment,
  getCommentsForPost,
  getRepliesForComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';

const router = Router();

router.post('/', createComment);
router.get('/post/:postId', getCommentsForPost);
router.get('/:id/replies', getRepliesForComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
