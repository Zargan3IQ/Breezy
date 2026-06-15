import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/post.model';
import { Tag } from '../models/tag.model';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create a new post or reply
 */
export const createPost = async (req: Request, res: Response) => {
  const { authorId, content, media, tags, parentPost } = req.body;

  if (!authorId || !content) {
    return res.status(400).json({ message: 'authorId and content are required.' });
  }

  try {
    const newPost = new Post({
      authorId,
      content,
      media: media || { type: null, url: null },
      parentPost: parentPost || null
    });

    const savedPost = await newPost.save();

    if (Array.isArray(tags) && tags.length > 0) {
      await Tag.insertMany(
        tags.map((tag: string) => ({ post_id: savedPost._id, tag: tag.toLowerCase().trim() })),
        { ordered: false } // ignore les doublons de tags envoyés deux fois
      );
    }

    // If this post is a reply increment the parents comments count
    if (parentPost && isValidObjectId(parentPost)) {
      await Post.findByIdAndUpdate(parentPost, { $inc: { commentsCount: 1 } });
    }

    return res.status(201).json({ ...savedPost.toObject(), tags: tags ?? [] });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

const attachTags = async (posts: any[]) => {
  const ids = posts.map((p) => p._id);
  const tagDocs = await Tag.find({ post_id: { $in: ids } });

  const tagsByPost = new Map<string, string[]>();
  for (const t of tagDocs) {
    const key = t.post_id.toString();
    if (!tagsByPost.has(key)) tagsByPost.set(key, []);
    tagsByPost.get(key)!.push(t.tag);
  }

  return posts.map((p) => ({ ...p.toObject(), tags: tagsByPost.get(p._id.toString()) ?? [] }));
};


/**
 * Retrieve all main posts (excluding replies)
 */
export const getAllMainPosts = async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find({ parentPost: null }).sort({ createdAt: -1 }); // Pour le moment on filtrr que les parents pour le get all a voir si on garde ça ?
    return res.status(200).json(await attachTags(posts));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Retrieve a specific post along with all its direct replies
 */
export const getPostWithReplies = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    const [postWithTags] = await attachTags([post]);
    const repliesWithTags = await attachTags(replies);
    return res.status(200).json({ post: postWithTags, replies: repliesWithTags });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Retrieve only the replies for a given post
 */
export const getRepliesForPost = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: 'Post ID is invalid.' });
  }

  try {
    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    return res.status(200).json(await attachTags(replies));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getPostsByTag = async (req: Request, res: Response) => {
  const rawTag = Array.isArray(req.params.tag) ? req.params.tag[0] : req.params.tag;
  const tag = (rawTag || '').toLowerCase().trim();

  try {
    const tagDocs = await Tag.find({ tag }).select('post_id');
    const postIds = tagDocs.map((d) => d.post_id);

    const posts = await Post.find({ _id: { $in: postIds }, parentPost: null }).sort({ createdAt: -1 });
    return res.status(200).json(await attachTags(posts));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Update an existing post
 */
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
      },
      { new: true, runValidators: true }
    );

    if (!updatedPost) return res.status(404).json({ message: 'Post not found.' });

        let resultTags: string[] | undefined;
    if (tags !== undefined) {
      await Tag.deleteMany({ post_id: id });
      if (Array.isArray(tags) && tags.length > 0) {
        await Tag.insertMany(tags.map((tag: string) => ({ post_id: id, tag: tag.toLowerCase().trim() })));
      }
      resultTags = tags;
    } else {
      const tagDocs = await Tag.find({ post_id: id }).select('tag');
      resultTags = tagDocs.map((d) => d.tag);
    }

    return res.status(200).json({ ...updatedPost.toObject(), tags: resultTags });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Delete a post
 */
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
    await Tag.deleteMany({ post_id: id });
    return res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};