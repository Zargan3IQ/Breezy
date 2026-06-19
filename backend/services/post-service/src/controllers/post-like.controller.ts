import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PostLike } from '../models/post-like.model';
import Post from '../models/post.model';
import { AppError } from '../utils/AppError';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Like a post
 */
export const likePost = async (req: Request, res: Response) => {
  const user_id = req.headers['x-user-id'] as string;
  const { post_id } = req.body;

  if (!user_id || !post_id) {
    throw new AppError(400, 'Authenticated user and post_id are required.');
  }

  if (!isValidObjectId(post_id)) {
    throw new AppError(400, 'post_id is invalid.');
  }

  try {
    await PostLike.create({ user_id, post_id });
    await Post.findByIdAndUpdate(post_id, { $inc: { likesCount: 1 } });

    return res.status(200).json({ message: 'Post liked successfully.' });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError(409, 'Post already liked.');
    }
    throw error;
  }
};

/**
 * Unlike a post
 */
export const unlikePost = async (req: Request, res: Response) => {
  const user_id = req.headers['x-user-id'] as string;
  const { post_id } = req.body;

  if (!user_id || !post_id) {
    throw new AppError(400, 'Authenticated user and post_id are required.');
  }

    const deleted = await PostLike.findOneAndDelete({ user_id, post_id });
    if (!deleted) throw new AppError(404, 'Like not found.');

    await Post.findByIdAndUpdate(post_id, { $inc: { likesCount: -1 } });

    return res.status(200).json({ message: 'Post unliked successfully.' });

};

/**
 * Get all posts liked by a user
 */
export const getUserPostLikes = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const docs = await PostLike.find({ user_id: userId }).select('post_id');
    return res.status(200).json({ user_id: userId, liked_posts: docs.map((d) => d.post_id) });
};

/**
 * Get all users who liked a post
 */
export const getPostLikers = async (req: Request, res: Response) => {
  const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;

  if (!isValidObjectId(postId)) {
    throw new AppError(400, 'Post ID is invalid.');
  }

    const docs = await PostLike.find({ post_id: postId }).select('user_id');
    return res.status(200).json({ post_id: postId, likers: docs.map((d) => d.user_id) });
};
