import { Request, Response } from 'express';
import { Follows } from '../models/follows.model';
import { UserCounters } from '../models/userCounters.model';
import { AppError } from '../utils/AppError';

/**
 * Follow a user
 */
export const followUser = async (req: Request, res: Response): Promise<void> => {
  const { follower_id, following_id } = req.body;

  if (!follower_id || !following_id) {
    throw new AppError(400, 'follower_id and following_id are required');
  }

  if (follower_id === following_id) {
    throw new AppError(400, 'Cannot follow yourself');
  }

  try {
    await Follows.create({ follower_id, following_id });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError(409, 'Already following this user');
    }
    throw err;
  }

  await UserCounters.findOneAndUpdate(
    { user_id: follower_id },
    { $inc: { following_count: 1 } },
    { upsert: true }
  );
  await UserCounters.findOneAndUpdate(
    { user_id: following_id },
    { $inc: { followers_count: 1 } },
    { upsert: true }
  );

  res.status(200).json({ message: 'User followed successfully' });
};


/**
 * Unfollow a user
 */
export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
  const { follower_id, following_id } = req.body;

  if (!follower_id || !following_id) {
    throw new AppError(400, 'follower_id and following_id are required');
  }

  const deleted = await Follows.findOneAndDelete({ follower_id, following_id });

  if (!deleted) {
    throw new AppError(404, 'Follow relationship not found');
  }

  await UserCounters.findOneAndUpdate(
    { user_id: follower_id },
    { $inc: { following_count: -1 } }
  );
  await UserCounters.findOneAndUpdate(
    { user_id: following_id },
    { $inc: { followers_count: -1 } }
  );

  res.status(200).json({ message: 'User unfollowed successfully' });
};

/**
 * Get list of followers of a user
 */
export const getFollowers = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const followDocs = await Follows.find({ following_id: userId });
  const followers = followDocs.map((doc) => doc.follower_id);

  res.status(200).json({ user_id: userId, followers });
};

/**
 * Get list of users followed by a user
 */
export const getFollowing = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const docs = await Follows.find({ follower_id: userId }).select('following_id');
  const following = docs.map((d) => d.following_id);

  res.status(200).json({ user_id: userId, following });
};
