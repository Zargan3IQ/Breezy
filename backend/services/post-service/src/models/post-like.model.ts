import { Schema, model, Document, Types } from 'mongoose';

export interface IPostLike extends Document {
  user_id: string;
  post_id: Types.ObjectId;
}

const postLikeSchema = new Schema<IPostLike>(
  {
    user_id: { type: String, required: true },
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  }
);

postLikeSchema.index({ user_id: 1, post_id: 1 }, { unique: true });
postLikeSchema.index({ post_id: 1 }); // "qui a liké ce post"

export const PostLike = model<IPostLike>('PostLike', postLikeSchema);