import mongoose, { Document, Schema } from 'mongoose';

export type MediaType = 'image' | 'video' | null;

export interface Media {
  type: MediaType;
  url: string | null;
}

export interface IPost extends Document {
  authorId: string;
  authorUsername: string;
  content: string;
  media: Media;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  parentPost: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    content: { type: String, required: true, maxlength: 280 },
    media: {
      type: {
        type: String,
        enum: ['image', 'video', null],
        default: null
      },
      url: { type: String, default: null }
    },
    tags: [{ type: String }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    parentPost: { type: Schema.Types.ObjectId, ref: 'Post', default: null }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IPost>('Post', PostSchema);