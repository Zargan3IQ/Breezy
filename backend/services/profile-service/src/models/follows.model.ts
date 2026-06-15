import { Schema, model, Document } from 'mongoose';

/**
 * Represents a follow relationship document in MongoDB.
 */
export interface IFollows extends Document {
  follower_id:  string;
  following_id: string;
  created_at:   Date;
}

const followsSchema  = new Schema<IFollows>({
  follower_id:  { type: String, required: true},
  following_id: { type: String, required: true },
  created_at:   { type: Date, default: Date.now },
});

followsSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });
followsSchema.index({ following_id: 1 }); // pour getFollowers

export const Follows = model<IFollows>('Follows', followsSchema);
