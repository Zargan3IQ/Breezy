import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PostLike } from '../models/post-like.model';
import Post from '../models/post.model';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Like a post
 */
export const likePost = async (req: Request, res: Response) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
    return res.status(400).json({ message: 'user_id and post_id are required.' });
  }

  if (!isValidObjectId(post_id)) {
    return res.status(400).json({ message: 'post_id is invalid.' });
  }

  try {
    await PostLike.create({ user_id, post_id });
    await Post.findByIdAndUpdate(post_id, { $inc: { likesCount: 1 } });

    return res.status(200).json({ message: 'Post liked successfully.' });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Post already liked.' });
    }
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Unlike a post
 */
export const unlikePost = async (req: Request, res: Response) => {
  const { user_id, post_id } = req.body;

  if (!user_id || !post_id) {
    return res.status(400).json({ message: 'user_id and post_id are required.' });
  }

  try {
    const deleted = await PostLike.findOneAndDelete({ user_id, post_id });
    if (!deleted) return res.status(404).json({ message: 'Like not found.' });

    await Post.findByIdAndUpdate(post_id, { $inc: { likesCount: -1 } });

    return res.status(200).json({ message: 'Post unliked successfully.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get all posts liked by a user
 */
export const getUserPostLikes = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  try {
    const docs = await PostLike.find({ user_id: userId }).select('post_id');
    return res.status(200).json({ user_id: userId, liked_posts: docs.map((d) => d.post_id) });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get all users who liked a post
 */
export const getPostLikers = async (req: Request, res: Response) => {
  const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const docs = await PostLike.find({ post_id: postId }).select('user_id');
    return res.status(200).json({ post_id: postId, likers: docs.map((d) => d.user_id) });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
