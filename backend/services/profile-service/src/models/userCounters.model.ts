import { Schema, model, Document } from 'mongoose';

/**
 * Stores aggregated counters for a user (followers, following).
 */
export interface IUserCounters extends Document {
  user_id:         string;
  followers_count: number;
  following_count: number;
}

const userCountersSchema = new Schema<IUserCounters>({
  user_id:         { type: String, required: true, unique: true },
  followers_count: { type: Number, default: 0 },
  following_count: { type: Number, default: 0 },
});

export const UserCounters = model<IUserCounters>('UserCounters', userCountersSchema);
