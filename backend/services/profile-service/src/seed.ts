import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Profile } from './models/profile.model';
import { Follows } from './models/follows.model';
import { UserCounters } from './models/userCounters.model';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required to run seeds.');
  }

  await mongoose.connect(mongoUri);

  await Follows.deleteMany({});
  await UserCounters.deleteMany({});
  await Profile.deleteMany({});

  await Profile.insertMany([
    {
      user_id: '11111111-1111-1111-1111-111111111111',
      bio: 'Admin Breezy - passionne de produit.',
      avatar_url: 'https://i.pravatar.cc/150?img=1',
    },
    {
      user_id: '22222222-2222-2222-2222-222222222222',
      bio: 'Moderateur - ici pour aider la communaute.',
      avatar_url: 'https://i.pravatar.cc/150?img=2',
    },
    {
      user_id: '33333333-3333-3333-3333-333333333333',
      bio: 'Utilisateur test pour les workflows QA.',
      avatar_url: 'https://i.pravatar.cc/150?img=3',
    },
  ]);

  await Follows.insertMany([
    {
      follower_id: '22222222-2222-2222-2222-222222222222',
      following_id: '11111111-1111-1111-1111-111111111111',
    },
    {
      follower_id: '33333333-3333-3333-3333-333333333333',
      following_id: '11111111-1111-1111-1111-111111111111',
    },
    {
      follower_id: '11111111-1111-1111-1111-111111111111',
      following_id: '22222222-2222-2222-2222-222222222222',
    },
  ]);

  await UserCounters.insertMany([
    {
      user_id: '11111111-1111-1111-1111-111111111111',
      followers_count: 2,
      following_count: 1,
    },
    {
      user_id: '22222222-2222-2222-2222-222222222222',
      followers_count: 1,
      following_count: 1,
    },
    {
      user_id: '33333333-3333-3333-3333-333333333333',
      followers_count: 0,
      following_count: 1,
    },
  ]);

  console.log('[profile-service] Seed termine: profils, follows et compteurs inseres.');
}

main()
  .catch((error) => {
    console.error('[profile-service] Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
