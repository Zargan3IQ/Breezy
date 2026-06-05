import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/post.model';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const createPost = async (req: Request, res: Response) => {
  const { authorId, authorUsername, content, media, tags, parentPost } = req.body;

  if (!authorId || !authorUsername || !content) {
    return res.status(400).json({ message: 'authorId, authorUsername, content are required.' });
  }

  try {
    const newPost = new Post({
      authorId,
      authorUsername,
      content,
      media: media || { type: null, url: null },
      tags: Array.isArray(tags) ? tags : [],
      parentPost: parentPost || null
    });

    const savedPost = await newPost.save();

    if (parentPost && isValidObjectId(parentPost)) {
      await Post.findByIdAndUpdate(parentPost, { $inc: { commentsCount: 1 } });
    }

    return res.status(201).json(savedPost);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getAllMainPosts = async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find({ parentPost: null }).sort({ createdAt: -1 }); // Pour le moment on filtrr que les parents pour le get all a voir si on garde ça ?
    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getPostWithReplies = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    return res.status(200).json({ post, replies });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getRepliesForPost = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    return res.status(200).json(replies);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { content, media, tags } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        ...(content !== undefined ? { content } : {}),
        ...(media !== undefined ? { media } : {}),
        ...(tags !== undefined ? { tags } : {})
      },
      { new: true, runValidators: true }
    );

    if (!updatedPost) return res.status(404).json({ message: 'Post not found.' });
    return res.status(200).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const deletePost = async (req: Request, res: Response) => {
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const postToDelete = await Post.findById(id);
    if (!postToDelete) return res.status(404).json({ message: 'Post not found.' });

    if (postToDelete.parentPost) {
      await Post.findByIdAndUpdate(postToDelete.parentPost, { $inc: { commentsCount: -1 } });
    }

    await Post.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};