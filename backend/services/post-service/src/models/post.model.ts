import mongoose, { Document, Schema } from 'mongoose';

/**
 * Allowed media types for a post
 * A post can contain either an image, a video, or no media
 */
export type MediaType = 'image' | 'video' | null;

/**
 * Media object structure attached to a post.
 */
export interface Media {
  type: MediaType;
  url: string | null;
}

/**
 * TypeScript interface representing a Post document in MongoDB.
 */
export interface IPost extends Document {
  authorId: string;
  authorUsername: string;
  content: string;
  media: Media;
  likesCount: number;
  commentsCount: number;
  parentPost: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema definition for posts.
 */
const PostSchema = new Schema<IPost>(
  {
    authorId: { type: String, required: true },
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

export default mongoose.model<IPost>('Post', PostSchema);