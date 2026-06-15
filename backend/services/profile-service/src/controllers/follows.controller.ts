import { Request, Response } from 'express';
import { Follows } from '../models/follows.model';
import { UserCounters } from '../models/userCounters.model';

/**
 * Follow a user
 */
export const followUser = async (req: Request, res: Response): Promise<void> => {
  const { follower_id, following_id } = req.body;

  if (!follower_id || !following_id) {
    res.status(400).json({ message: 'follower_id and following_id are required' });
    return;
  }

  if (follower_id === following_id) {
    res.status(400).json({ message: 'Cannot follow yourself' });
    return;
  }

  try {
    await Follows.create({ follower_id, following_id });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ message: 'Already following this user' });
      return;
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
    res.status(400).json({ message: 'follower_id and following_id are required' });
    return;
  }

  const deleted = await Follows.findOneAndDelete({ follower_id, following_id });

  if (!deleted) {
    res.status(404).json({ message: 'Follow relationship not found' });
    return;
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
