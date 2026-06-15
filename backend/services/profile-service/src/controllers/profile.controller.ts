import { Request, Response } from 'express';
import { Profile } from '../models/profile.model';
import { UserCounters } from '../models/userCounters.model';

/**
 * Create a new user profile
 * Also initializes user counters (followers/following)
 */
export const createProfile = async (req: Request, res: Response): Promise<void> => {
  const { user_id, bio, avatar_url } = req.body;

  if (!user_id) {
    res.status(400).json({ message: 'user_id is required' });
    return;
  }

  const existing = await Profile.findOne({ user_id });
  if (existing) {
    res.status(409).json({ message: 'Profile already exists' });
    return;
  }

  const profile = new Profile({ user_id, bio, avatar_url });
  await profile.save();

  await UserCounters.create({ user_id, followers_count: 0, following_count: 0 });

  res.status(201).json(profile);
};

/**
 * Get a user profile + counters
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const profile = await Profile.findOne({ user_id: userId });
  if (!profile) {
    res.status(404).json({ message: 'Profile not found' });
    return;
  }

  const counters = await UserCounters.findOne({ user_id: userId });
  res.status(200).json({ ...profile.toObject(), counters });
};

/**
 * Update profile fields (partial update)
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { bio, avatar_url } = req.body;

  const profile = await Profile.findOneAndUpdate(
    { user_id: userId },
    {
      ...(bio !== undefined && { bio }),
      ...(avatar_url !== undefined && { avatar_url }),
    },
    { new: true }
  );

  if (!profile) {
    res.status(404).json({ message: 'Profile not found' });
    return;
  }

  res.status(200).json(profile);
};

/**
 * Delete a profile and associated counters
 */
export const deleteProfile = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const profile = await Profile.findOneAndDelete({ user_id: userId });
  if (!profile) {
    res.status(404).json({ message: 'Profile not found' });
    return;
  }

  await UserCounters.deleteOne({ user_id: userId });

  res.status(200).json({ message: 'Profile deleted' });
};
