import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/post.model';
import { Tag } from '../models/post-tag.model';
import { AppError } from '../utils/AppError';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create a new post or reply
 */
export const createPost = async (req: Request, res: Response) => {
  const authorId = req.headers['x-user-id'] as string;
  const { content, media, tags, parentPost } = req.body;

  if (!authorId || !content) {
    throw new AppError(400, 'Authenticated user and content are required.');
  }

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

};

const attachPostTags = async (posts: any[]) => {
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
    const posts = await Post.find({ parentPost: null }).sort({ createdAt: -1 }); // Pour le moment on filtrr que les parents pour le get all a voir si on garde ça ?
    return res.status(200).json(await attachPostTags(posts));

};

/**
 * Retrieve posts from a specific set of authors (followed-users feed)
 */
export const getFeedPosts = async (req: Request, res: Response) => {
  const raw = req.query.authorIds as string | string[] | undefined;
  const authorIds = Array.isArray(raw) ? raw : raw ? raw.split(',') : [];

  if (authorIds.length === 0) {
    return res.status(200).json([]);
  }

  const posts = await Post.find({ parentPost: null, authorId: { $in: authorIds } })
    .sort({ createdAt: -1 });
  return res.status(200).json(await attachPostTags(posts));
};

/**
 * Retrieve a specific post along with all its direct replies
 */
export const getPostWithReplies = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Post ID is invalid.');
  }

    const post = await Post.findById(id);
    if (!post) throw new AppError(404, 'Post not found.');

    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    const [postWithTags] = await attachPostTags([post]);
    const repliesWithTags = await attachPostTags(replies);
    return res.status(200).json({ post: postWithTags, replies: repliesWithTags });

};

/**
 * Retrieve only the replies for a given post
 */
export const getRepliesForPost = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Post ID is invalid.');
  }

    const replies = await Post.find({ parentPost: id }).sort({ createdAt: 1 });
    return res.status(200).json(await attachPostTags(replies));

};

export const getPostsByTag = async (req: Request, res: Response) => {
  const rawTag = Array.isArray(req.params.tag) ? req.params.tag[0] : req.params.tag;
  const tag = (rawTag || '').toLowerCase().trim();

    const tagDocs = await Tag.find({ tag }).select('post_id');
    const postIds = tagDocs.map((d) => d.post_id);

    const posts = await Post.find({ _id: { $in: postIds }, parentPost: null }).sort({ createdAt: -1 });
    return res.status(200).json(await attachPostTags(posts));

};

/**
 * Update an existing post
 */
export const updatePost = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { content, media, tags } = req.body;

  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Post ID is invalid.');
  }

    const existingPost = await Post.findById(id);
    if (!existingPost) throw new AppError(404, 'Post not found.');

    const requestingUserId = req.headers['x-user-id'] as string | undefined;
    if (!requestingUserId || requestingUserId !== existingPost.authorId.toString()) {
      throw new AppError(403, 'You are not allowed to edit this post.');
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        ...(content !== undefined ? { content } : {}),
        ...(media !== undefined ? { media } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!updatedPost) throw new AppError(404, 'Post not found.');

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

};

/**
 * Delete a post
 */
export const deletePost = async (req: Request, res: Response) => {
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) {
    throw new AppError(400, 'Post ID is invalid.');
  }

    const postToDelete = await Post.findById(id);
    if (!postToDelete) throw new AppError(404, 'Post not found.');

    const requestingUserId = req.headers['x-user-id'] as string | undefined;
    if (!requestingUserId || requestingUserId !== postToDelete.authorId.toString()) {
      throw new AppError(403, 'You are not allowed to delete this post.');
    }

    if (postToDelete.parentPost) {
      await Post.findByIdAndUpdate(postToDelete.parentPost, { $inc: { commentsCount: -1 } });
    }

    await Post.findByIdAndDelete(id);
    await Tag.deleteMany({ post_id: id });
    return res.status(200).json({ message: 'Post deleted successfully.' });

};

/**
 * Retrieve a specific set of posts by their IDs
 */
export const getPostsByIds = async (req: Request, res: Response) => {
  const raw = req.query.ids as string | string[] | undefined;
  const ids = Array.isArray(raw) ? raw : raw ? raw.split(',') : [];

  if (ids.length === 0) {
    return res.status(200).json([]);
  }

  const posts = await Post.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
  return res.status(200).json(await attachPostTags(posts));
};

/**
 * Search posts by content or tag
 */
export const searchPosts = async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) throw new AppError(400, 'Query parameter "q" is required.');

    const [byText, tagDocs] = await Promise.all([
      Post.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }),
      Tag.find({ tag: q.toLowerCase() }).select('post_id'),
    ]);

    const textIds = new Set(byText.map((p) => p._id.toString()));
    const tagPostIds = tagDocs.map((t) => t.post_id).filter((id) => !textIds.has(id.toString()));
    const byTag = tagPostIds.length > 0 ? await Post.find({ _id: { $in: tagPostIds } }) : [];

    return res.status(200).json(await attachPostTags([...byText, ...byTag]));

};
