import { Router } from 'express';
import {
  createComment,
  getCommentsForPost,
  getRepliesForComment,
  getCommentsByTag,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';

const router = Router();

router.post('/', createComment);
router.get('/tags/:tag', getCommentsByTag);
router.get('/post/:postId', getCommentsForPost);
router.get('/:id/replies', getRepliesForComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
