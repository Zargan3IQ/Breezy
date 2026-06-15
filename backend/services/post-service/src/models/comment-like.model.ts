import { Schema, model, Document, Types } from 'mongoose';

export interface ICommentLike extends Document {
  user_id: string;
  comment_id: Types.ObjectId;
}

const commentLikeSchema = new Schema<ICommentLike>(
  {
    user_id: { type: String, required: true },
    comment_id: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  }
);

commentLikeSchema.index({ user_id: 1, comment_id: 1 }, { unique: true });
commentLikeSchema.index({ comment_id: 1 }); // "qui a liké ce commentaire"

export const CommentLike = model<ICommentLike>('CommentLike', commentLikeSchema);
