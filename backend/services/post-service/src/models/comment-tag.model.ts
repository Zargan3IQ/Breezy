import { Schema, model, Document, Types } from 'mongoose';

export interface ICommentTag extends Document {
  comment_id: Types.ObjectId;
  tag: string;
}

const commentTagSchema = new Schema<ICommentTag>({
  comment_id: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  tag: { type: String, required: true, lowercase: true, trim: true },
});

commentTagSchema.index({ comment_id: 1, tag: 1 }, { unique: true });
commentTagSchema.index({ tag: 1 }); // "tous les comments avec ce tag"

export const CommentTag = model<ICommentTag>('CommentTag', commentTagSchema);
