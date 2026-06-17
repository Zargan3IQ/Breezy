import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Post from './models/post.model';
import { Comment } from './models/comment.model';
import { Tag } from './models/post-tag.model';
import { CommentTag } from './models/comment-tag.model';
import { PostLike } from './models/post-like.model';
import { CommentLike } from './models/comment-like.model';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required to run seeds.');
  }

  await mongoose.connect(mongoUri);

  await CommentLike.deleteMany({});
  await PostLike.deleteMany({});
  await CommentTag.deleteMany({});
  await Tag.deleteMany({});
  await Comment.deleteMany({});
  await Post.deleteMany({});

  const postA = await Post.create({
    authorId: '11111111-1111-1111-1111-111111111111',
    content: 'Bienvenue sur Breezy. Premier post de demonstration.',
    media: { type: null, url: null },
  });

  const postB = await Post.create({
    authorId: '22222222-2222-2222-2222-222222222222',
    content: 'Une petite update produit: seed des donnees en cours.',
    media: { type: 'image', url: 'https://picsum.photos/seed/breezy/800/400' },
  });

  const replyToA = await Post.create({
    authorId: '33333333-3333-3333-3333-333333333333',
    content: 'Reponse au premier post.',
    media: { type: null, url: null },
    parentPost: postA._id,
  });

  await Tag.insertMany([
    { post_id: postA._id, tag: 'welcome' },
    { post_id: postA._id, tag: 'breezy' },
    { post_id: postB._id, tag: 'update' },
    { post_id: replyToA._id, tag: 'reply' },
  ]);

  const commentA1 = await Comment.create({
    post_id: postA._id,
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'Super nouvelle, merci pour le lancement.',
    parent_comment_id: null,
  });

  const commentA1Reply = await Comment.create({
    post_id: postA._id,
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Merci beaucoup pour le soutien.',
    parent_comment_id: commentA1._id,
  });

  await CommentTag.insertMany([
    { comment_id: commentA1._id, tag: 'support' },
    { comment_id: commentA1Reply._id, tag: 'gratitude' },
  ]);

  await PostLike.insertMany([
    { user_id: '22222222-2222-2222-2222-222222222222', post_id: postA._id },
    { user_id: '33333333-3333-3333-3333-333333333333', post_id: postA._id },
    { user_id: '11111111-1111-1111-1111-111111111111', post_id: postB._id },
  ]);

  await CommentLike.insertMany([
    { user_id: '11111111-1111-1111-1111-111111111111', comment_id: commentA1._id },
    { user_id: '33333333-3333-3333-3333-333333333333', comment_id: commentA1._id },
  ]);

  await Post.findByIdAndUpdate(postA._id, { likesCount: 2, commentsCount: 2 });
  await Post.findByIdAndUpdate(postB._id, { likesCount: 1, commentsCount: 0 });
  await Post.findByIdAndUpdate(replyToA._id, { likesCount: 0, commentsCount: 0 });
  await Comment.findByIdAndUpdate(commentA1._id, { likesCount: 2, commentsCount: 1 });
  await Comment.findByIdAndUpdate(commentA1Reply._id, { likesCount: 0, commentsCount: 0 });

  console.log('[post-service] Seed termine: 3 posts, 2 commentaires, likes et tags inseres.');
}

main()
  .catch((error) => {
    console.error('[post-service] Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
