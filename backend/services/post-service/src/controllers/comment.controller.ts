import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Comment } from '../models/comment.model';
import { CommentTag } from '../models/comment-tag.model';
import Post from '../models/post.model';
import { AppError } from '../utils/AppError';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const createComment = async (req: Request, res: Response) => {
  const user_id = req.headers['x-user-id'] as string;
  const { post_id, content, parent_comment_id, tags } = req.body;


  if (!post_id || !user_id || !content) {
    throw new AppError(400, 'post_id, content, and authenticated user are required.');
  }
  if (!isValidObjectId(post_id)) throw new AppError(400, 'post_id is invalid.');
  if (parent_comment_id && !isValidObjectId(parent_comment_id)) {
    throw new AppError(400, 'parent_comment_id is invalid.');
  }

    const post = await Post.findById(post_id);
    if (!post) throw new AppError(404, 'Post not found.');

    if (parent_comment_id) {
      const parent = await Comment.findById(parent_comment_id);
      if (!parent) throw new AppError(404, 'Parent comment not found.');
    }

    const comment = await Comment.create({ post_id, user_id, content, parent_comment_id: parent_comment_id || null });

    if (Array.isArray(tags) && tags.length > 0) {
      await CommentTag.insertMany(
        tags.map((tag: string) => ({ comment_id: comment._id, tag: tag.toLowerCase().trim() })),
        { ordered: false }
      );
    }

    await Post.findByIdAndUpdate(post_id, { $inc: { commentsCount: 1 } });

    return res.status(201).json({ ...comment.toObject(), tags: tags ?? [] });
 
};

const attachCommentTags = async (comments: any[]) => {
  const ids = comments.map((c) => c._id);
  const tagDocs = await CommentTag.find({ comment_id: { $in: ids } });

  const tagsByComment = new Map<string, string[]>();
  for (const t of tagDocs) {
    const key = t.comment_id.toString();
    if (!tagsByComment.has(key)) tagsByComment.set(key, []);
    tagsByComment.get(key)!.push(t.tag);
  }

  return comments.map((c) => ({
    ...(c.toObject ? c.toObject() : c),
    tags: tagsByComment.get(c._id.toString()) ?? [],
  }));
};

export const getCommentsByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const comments = await Comment.find({ user_id: userId, parent_comment_id: null })
    .sort({ createdAt: -1 });
  return res.status(200).json(await attachCommentTags(comments));
};

export const getCommentsForPost = async (req: Request, res: Response) => {
  const postId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  if (!isValidObjectId(postId)) throw new AppError(400, 'Post ID is invalid.');

    const comments = await Comment.find({ post_id: postId, parent_comment_id: null }).sort({ createdAt: -1 });
    return res.status(200).json(await attachCommentTags(comments));
 
};

export const getRepliesForComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) throw new AppError(400, 'Comment ID is invalid.');

    const replies = await Comment.find({ parent_comment_id: id }).sort({ createdAt: 1 });
    return res.status(200).json(await attachCommentTags(replies));
  
};

export const getCommentsByTag = async (req: Request, res: Response) => {
  const rawTag = Array.isArray(req.params.tag) ? req.params.tag[0] : req.params.tag;
  const tag = (rawTag || '').toLowerCase().trim();

    const tagDocs = await CommentTag.find({ tag }).select('comment_id');
    const commentIds = tagDocs.map((d) => d.comment_id);
    const comments = await Comment.find({ _id: { $in: commentIds } }).sort({ createdAt: -1 });
    return res.status(200).json(await attachCommentTags(comments));

};

export const updateComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { content, tags } = req.body;
  if (!isValidObjectId(id)) throw new AppError(400, 'Comment ID is invalid.');
  if (!content) throw new AppError(400, 'content is required.');

    const updated = await Comment.findByIdAndUpdate(id, { content }, { new: true, runValidators: true });
    if (!updated) throw new AppError(404, 'Comment not found.');

    let resultTags: string[] | undefined;
    if (tags !== undefined) {
      await CommentTag.deleteMany({ comment_id: id });
      if (Array.isArray(tags) && tags.length > 0) {
        await CommentTag.insertMany(tags.map((tag: string) => ({ comment_id: id, tag: tag.toLowerCase().trim() })));
      }
      resultTags = tags;
    } else {
      const tagDocs = await CommentTag.find({ comment_id: id }).select('tag');
      resultTags = tagDocs.map((d) => d.tag);
    }

    return res.status(200).json({ ...updated.toObject(), tags: resultTags });
};

export const deleteComment = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!isValidObjectId(id)) throw new AppError(400, 'Comment ID is invalid.');

    const comment = await Comment.findById(id);
    if (!comment) throw new AppError(404, 'Comment not found.');

    await Comment.findByIdAndDelete(id);
    await Comment.deleteMany({ parent_comment_id: id });
    await CommentTag.deleteMany({ comment_id: id });
    await Post.findByIdAndUpdate(comment.post_id, { $inc: { commentsCount: -1 } });

    return res.status(200).json({ message: 'Comment deleted successfully.' });
 
};

/**
 * Search comments by content or tag
 */
export const searchComments = async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) throw new AppError(400, 'Query parameter "q" is required.');

    const [byText, tagDocs] = await Promise.all([
      Comment.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }),
      CommentTag.find({ tag: q.toLowerCase() }).select('comment_id'),
    ]);

    const textIds = new Set(byText.map((c) => c._id.toString()));
    const tagCommentIds = tagDocs.map((t) => t.comment_id).filter((id) => !textIds.has(id.toString()));
    const byTag = tagCommentIds.length > 0 ? await Comment.find({ _id: { $in: tagCommentIds } }) : [];

    return res.status(200).json(await attachCommentTags([...byText, ...byTag]));

};

