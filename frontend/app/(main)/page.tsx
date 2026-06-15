"use client"; // Required because we are managing State here now

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ComposePost from '@/components/feed/ComposePost';
import PostCard from '@/components/feed/PostCard';
import { MOCK_POSTS } from '@/lib/utils/mockData';
import { Post, Reply } from '@/types/post';

export default function HomeFeed() {
  // 1. Initialize state with our fake data
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const { t } = useTranslation('common');

  // 2. Create a function to handle creating a new post
  // TODO - Later, this will call the backend API to create a post and get the full post object back 
  // (with ID, timestamps, etc). For now, we'll just create a fake post object on the frontend.
  const handleAddNewPost = (content: string) => {
    // Create a fake post object. Later, this will be created by your database.
    const newPost: Post = {
      id: Date.now().toString(), // Generate a fake unique ID based on time
      author: {
        id: 'u_current',
        name: 'VibrantLife', // Pretend we are this user for now
        username: 'VibrantLife',
        avatarUrl: 'https://i.pravatar.cc/150?u=current',
      },
      content: content,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      createdAt: 'Just now',
    };

    // 3. Update the state: Put the new post at the FRONT of the array, followed by the old posts
    setPosts([newPost, ...posts]);
  };

  const handleToggleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const currentlyLiked = post.isLiked || false;
        return {
          ...post,
          isLiked: !currentlyLiked,
          likesCount: currentlyLiked ? post.likesCount - 1 : post.likesCount + 1
        };
      }
      return post;
    }));
  };

  // HOW IT WORKS: We create a fake reply object, find the correct post, 
  // and inject the reply into its 'replies' array.
  const handleReply = (postId: string, replyContent: string) => {
    const newReply: Reply = {
      id: Date.now().toString(),
      author: { id: 'u_current', name: 'VibrantLife', username: 'VibrantLife', avatarUrl: 'https://i.pravatar.cc/150?u=current' },
      content: replyContent,
    };

    setPosts(posts.map(post => {
      if (post.id === postId) {
        const existingReplies = post.replies || [];
        return {
          ...post,
          replies: [...existingReplies, newReply],
          commentsCount: post.commentsCount + 1
        };
      }
      return post;
    }));
  };

  return (
    <main className="w-full max-w-150 border-x border-gray-200 min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">{t('home_page.title')}</h1>
      </header>

      <ComposePost onPost={handleAddNewPost} />

      <section>
        {posts.map((post) => {
          const PostCardAny = PostCard as any;
          return (
            <PostCardAny
              key={post.id}
              post={post}
              // We pass the functions DOWN to the child component here
              onLike={() => handleToggleLike(post.id)}
              onReply={(content: any) => handleReply(post.id, content)}
            />
          );
        })}
      </section>
    </main>
  );
}