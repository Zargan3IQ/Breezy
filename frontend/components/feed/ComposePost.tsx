"use client"; // Required because we use React state and event listeners

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

// 1. Define the props this component expects
// TODO: Change this when API WORKS
interface ComposePostProps {
  onPost: (content: string) => void;
}

// 2. Destructure the onPost function from props
export default function ComposePost({ onPost }: ComposePostProps) {
  const { t } = useTranslation('common');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length === 0) return;

    // 3. Pass the content up to the parent component
    onPost(content); 
    
    // 4. Clear the input box
    setContent(''); 
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex gap-3">
        <Avatar 
          src="https://i.pravatar.cc/150?u=current" 
          alt="My Avatar" 
          size="md" 
        />
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('compose_post.placeholder')}
            className="w-full bg-transparent text-xl outline-none resize-none min-h-15 placeholder-gray-500"
            maxLength={280}
          />
          <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
            <div className="text-blue-500">
              {/* Media icons placeholders */}
              <span>🖼️</span> 
            </div>
            <Button 
              type="submit"
              disabled={content.trim().length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-4 rounded-full disabled:opacity-50"
            >
              {t('compose_post.submit_button')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}