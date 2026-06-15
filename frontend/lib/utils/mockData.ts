import { Post } from '@/types/post';

export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    author: {
      id: 'u1',
      name: 'VibrantLife',
      username: 'VibrantLife',
      avatarUrl: 'https://i.pravatar.cc/150?u=vibrant',
    },
    content: 'Exploring the city! 🌇🍁 Loving the colors of this new app!',
    imageUrl: 'https://images.unsplash.com/photo-1494522358652-330ea12bbce0?auto=format&fit=crop&w=800&q=80',
    likesCount: 358,
    commentsCount: 50,
    repostsCount: 28,
    createdAt: '2h',
  },
  {
    id: '2',
    author: {
      id: 'u2',
      name: 'Tech Insider',
      username: 'techinsider',
      avatarUrl: 'https://i.pravatar.cc/150?u=tech',
    },
    content: 'Just deployed my first Next.js app! The developer experience is unmatched. 🚀',
    likesCount: 120,
    commentsCount: 12,
    repostsCount: 5,
    createdAt: '4h',
  }
];