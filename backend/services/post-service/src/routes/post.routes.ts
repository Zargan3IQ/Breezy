import { Router } from 'express';
import {
  createPost,
  getAllMainPosts,
  getPostWithReplies,
  getRepliesForPost,
  getPostsByTag,
  updatePost,
  deletePost
} from '../controllers/posts.controller';

const router = Router();

router.post('/', createPost);
router.get('/', getAllMainPosts);
router.get('/tags/:tag', getPostsByTag); 
router.get('/:id', getPostWithReplies);
router.get('/:id/replies', getRepliesForPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;