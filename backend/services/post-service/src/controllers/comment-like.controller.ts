import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CommentLike } from '../models/comment-like.model';
import { Comment } from '../models/comment.model';
import { AppError } from '../utils/AppError';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Like a comment
 */
export const likeComment = async (req: Request, res: Response) => {
  const user_id = req.headers['x-user-id'] as string;
  const { comment_id } = req.body;

  if (!user_id || !comment_id) {
    throw new AppError(400, 'comment_id is required.');
  }

  if (!isValidObjectId(comment_id)) {
    throw new AppError(400, 'comment_id is invalid.');
  }

  try {
    const comment = await Comment.findById(comment_id);
    if (!comment) throw new AppError(404, 'Comment not found.');

    await CommentLike.create({ user_id, comment_id });
    await Comment.findByIdAndUpdate(comment_id, { $inc: { likesCount: 1 } });
    return res.status(200).json({ message: 'Comment liked successfully.' });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError(409, 'Comment already liked.');
    }
    throw error;
  }
};

/**
 * Unlike a comment
 */
export const unlikeComment = async (req: Request, res: Response) => {
  const user_id = req.headers['x-user-id'] as string;
  const { comment_id } = req.body;

  if (!user_id || !comment_id) {
    throw new AppError(400, 'comment_id is required.');
  }

    const deleted = await CommentLike.findOneAndDelete({ user_id, comment_id });
    if (!deleted) throw new AppError(404, 'Like not found.');

    await Comment.findByIdAndUpdate(comment_id, { $inc: { likesCount: -1 } });
    return res.status(200).json({ message: 'Comment unliked successfully.' });
};

/**
 * Get all comments liked by a user
 */
export const getUserCommentLikes = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const docs = await CommentLike.find({ user_id: userId }).select('comment_id');
    return res.status(200).json({ user_id: userId, liked_comments: docs.map((d) => d.comment_id) });

};

/**
 * Get all users who liked a comment
 */
export const getCommentLikers = async (req: Request, res: Response) => {
  const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;

  if (!isValidObjectId(commentId)) {
    throw new AppError(400, 'Comment ID is invalid.');
  }

    const docs = await CommentLike.find({ comment_id: commentId }).select('user_id');
    return res.status(200).json({ comment_id: commentId, likers: docs.map((d) => d.user_id) });

};
