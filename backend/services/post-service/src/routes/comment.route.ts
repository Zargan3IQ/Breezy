import { Router } from 'express';
import {
  createComment,
  getCommentById,
  getCommentsByUser,
  getCommentsForPost,
  getRepliesForComment,
  getCommentsByTag,
  searchComments,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';

const router = Router();

router.post('/', createComment);
router.get('/search', searchComments);
router.get('/tags/:tag', getCommentsByTag);
router.get('/post/:postId', getCommentsForPost);
router.get('/user/:userId', getCommentsByUser);
router.get('/:id/replies', getRepliesForComment);
router.get('/:id', getCommentById);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
