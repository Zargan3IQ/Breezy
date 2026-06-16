import { Schema, model, Document, Types } from 'mongoose';

export type MediaType = 'image' | 'video' | null;

/**
 * Media object structure attached to a post.
 */
export interface Media {
  type: MediaType;
  url: string | null;
}

export interface IComment extends Document {
  post_id: Types.ObjectId;
  user_id: string;
  parent_comment_id: Types.ObjectId | null;
  media: Media;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    user_id: { type:  String, required: true },
    parent_comment_id: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    content: { type: String, required: true, maxlength: 280 },
    media: {
      type: {
        type: String,
        enum: ['image', 'video', null],
        default: null
      },
      url: { type: String, default: null }
    },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true
  }
);

commentSchema.index({ post_id: 1, createdAt: -1 }); // commentaires d'un post
commentSchema.index({ parent_comment_id: 1 }); // réponses à un commentaire

export const Comment = model<IComment>('Comment', commentSchema);
