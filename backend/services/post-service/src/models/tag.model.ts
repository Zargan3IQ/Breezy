import { Schema, model, Document, Types } from 'mongoose';

export interface ITag extends Document {
  post_id: Types.ObjectId;
  tag: string;
}

const tagSchema = new Schema<ITag>({
  post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  tag:     { type: String, required: true, lowercase: true, trim: true },
});

tagSchema.index({ post_id: 1, tag: 1 }, { unique: true }); // pas de doublon de tag sur un post
tagSchema.index({ tag: 1 }); // pour "tous les posts avec ce tag"

export const Tag = model<ITag>('Tag', tagSchema);
