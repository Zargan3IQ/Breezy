import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Comment } from '../models/comment.model';
import Post from '../models/post.model';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create a comment on a post (or a reply to another comment)
 */
export const createComment = async (req: Request, res: Response) => {
  const { post_id, user_id, content, parent_comment_id } = req.body;

  if (!post_id || !user_id || !content) {
    return res.status(400).json({ message: 'post_id, user_id and content are required.' });
  }

  if (!isValidObjectId(post_id)) {
    return res.status(400).json({ message: 'post_id is invalid.' });
  }

  if (parent_comment_id && !isValidObjectId(parent_comment_id)) {
    return res.status(400).json({ message: 'parent_comment_id is invalid.' });
  }

  try {
    const post = await Post.findById(post_id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    if (parent_comment_id) {
      const parentComment = await Comment.findById(parent_comment_id);
      if (!parentComment) return res.status(404).json({ message: 'Parent comment not found.' });
    }

    const comment = await Comment.create({
      post_id,
      user_id,
      content,
      parent_comment_id: parent_comment_id || null,
    });

    await Post.findByIdAndUpdate(post_id, { $inc: { commentsCount: 1 } });

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get top-level comments for a post
 */
export const getCommentsForPost = async (req: Request, res: Response) => {
  const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const comments = await Comment.find({ post_id: postId, parent_comment_id: null }).sort({ createdAt: -1 });
    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Get replies to a comment
 */
export const getRepliesForComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Comment ID is invalid.' });
  }

  try {
    const replies = await Comment.find({ parent_comment_id: id }).sort({ createdAt: 1 });
    return res.status(200).json(replies);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Update a comment's content
 */
export const updateComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { content } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Comment ID is invalid.' });
  }

  if (!content) {
    return res.status(400).json({ message: 'content is required.' });
  }

  try {
    const updated = await Comment.findByIdAndUpdate(id, { content }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Comment not found.' });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Comment ID is invalid.' });
  }

  try {
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    await Comment.findByIdAndDelete(id);
    await Comment.deleteMany({ parent_comment_id: id }); // supprime aussi les réponses directes
    await Post.findByIdAndUpdate(comment.post_id, { $inc: { commentsCount: -1 } });

    return res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
