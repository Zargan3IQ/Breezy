"use client"; // We are adding local UI state (isReplying), so this becomes a Client Component

import Avatar from "@/components/ui/Avatar";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Post } from '@/types/post';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onReply: (content: string) => void;
}

export default function PostCard({ post, onLike, onReply }: PostCardProps) {
  const { t } = useTranslation('common');
  // Local state just to toggle the reply input box open and closed
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const submitReply = () => {
    if (replyText.trim().length === 0) return;
    onReply(replyText); // Send the text UP to HomeFeed
    setReplyText('');   // Clear the input
    setIsReplying(false); // Close the reply box
  };

  return (
    <article className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar src={post.author.avatarUrl} alt={post.author.username} size="md" />
        </div>

        {/* Post Content */}
        <div className="flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-gray-900">{post.author.name}</span>
            <span className="text-gray-500">@{post.author.username}</span>
          </div>

          <p className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap">{post.content}</p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 text-gray-500 max-w-md">
            
            {/* REPLY BUTTON */}
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
              <span>💬</span> {post.commentsCount}
            </button>

            {/* REPOST BUTTON (Placeholder) */}
            <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
              <span>🔁</span> {post.repostsCount}
            </button>

            {/* LIKE BUTTON */}
            <button 
              onClick={onLike}
              // If isLiked is true, make it red. Otherwise, keep it gray.
              className={`flex items-center gap-2 transition-colors ${post.isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <span>{post.isLiked ? '❤️' : '🤍'}</span> {post.likesCount}
            </button>

          </div>

          {/* HIDDEN REPLY BOX: Only shows if isReplying is true */}
          {isReplying && (
            <div className="mt-4 flex gap-2">
              <input 
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('post_card.reply_placeholder')}
                className="flex-1 bg-transparent border-b border-gray-300 outline-none focus:border-teal-500 py-1"
              />
              <button 
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="bg-teal-600 text-white px-4 py-1 rounded-full text-sm font-bold disabled:opacity-50"
              >
                {t('post_card.reply_button')}
              </button>
            </div>
          )}

          {/* DISPLAY REPLIES (If any exist) */}
          {post.replies && post.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {post.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <span className="font-bold mr-2">{reply.author.name}</span>
                  <span className="text-gray-700">{reply.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}