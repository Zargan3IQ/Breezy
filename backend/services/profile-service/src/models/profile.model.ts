import { Schema, model, Document } from 'mongoose';

/**
 * User public profile information 
 */
export interface IProfile extends Document {
  user_id: string;
  bio: string;
  avatar_url: string;
}

const profileSchema = new Schema<IProfile>({
  user_id:    { type: String, required: true, unique: true },
  bio:        { type: String, default: '' },
  avatar_url: { type: String, default: '' },
});

export const Profile = model<IProfile>('Profile', profileSchema);
