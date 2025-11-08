'use client';

import { useState } from 'react';
import { ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedInPostPreviewProps {
  content: string;
  characterCount: number;
  generatedAt?: string;
  userName?: string;
  userHeadline?: string;
  userAvatar?: string;
}

export function LinkedInPostPreview({
  content,
  characterCount,
  generatedAt,
  userName = 'Your Name',
  userHeadline = 'Your Professional Headline',
  userAvatar,
}: LinkedInPostPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const timestamp = generatedAt
    ? `${Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000)}m`
    : 'Just now';

  // Calculate if content needs truncation (more than 3 lines or 210 chars)
  const lines = content.split('\n');
  const needsTruncation = lines.length > 3 || content.length > 210;

  // Get truncated content (first 3 lines or 210 chars)
  const getTruncatedContent = () => {
    if (content.length <= 210) return content;

    const truncated = content.substring(0, 210);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
  };

  const displayContent = isExpanded || !needsTruncation ? content : getTruncatedContent();

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Check if line contains hashtags
      const hasHashtags = line.includes('#');
      if (hasHashtags) {
        const parts = line.split(/(\s#\w+)/g);
        return (
          <div key={i}>
            {parts.map((part, j) =>
              part.match(/^\s#\w+/) ? (
                <span key={j} className="text-[#0A66C2] font-medium">
                  {part}
                </span>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </div>
        );
      }
      return <div key={i}>{line || '\u00A0'}</div>;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden max-w-[550px]">
      {/* Post Header */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {userName}
                </h3>
                <p className="text-xs text-gray-600 truncate">
                  {userHeadline}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-gray-500">{timestamp}</span>
                  <span className="text-gray-400">•</span>
                  <Globe className="h-3 w-3 text-gray-500" />
                </div>
              </div>
              <button className="text-gray-600 hover:bg-gray-100 p-1 rounded ml-2">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-3 pb-2">
        <div className="text-sm text-gray-900 leading-[1.4] whitespace-pre-wrap break-words">
          {renderContent(displayContent)}
          {needsTruncation && !isExpanded && (
            <span className="text-gray-500">...</span>
          )}
        </div>

        {needsTruncation && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-600 font-medium hover:text-[#0A66C2] mt-1"
          >
            {isExpanded ? '...see less' : '...see more'}
          </button>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-600 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-0.5">
            <div className="w-4 h-4 rounded-full bg-[#0A66C2] flex items-center justify-center border border-white">
              <ThumbsUp className="h-2 w-2 text-white fill-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-[#6DAA44] flex items-center justify-center border border-white">
              <span className="text-[7px]">👏</span>
            </div>
            <div className="w-4 h-4 rounded-full bg-[#DF704D] flex items-center justify-center border border-white">
              <span className="text-[7px]">💡</span>
            </div>
          </div>
          <span className="ml-0.5">125</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>18 comments</span>
          <span>•</span>
          <span>6 reposts</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-1 py-1 flex items-center justify-around border-t border-gray-200">
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors flex-1 justify-center">
          <ThumbsUp className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-600">Like</span>
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors flex-1 justify-center">
          <MessageSquare className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-600">Comment</span>
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors flex-1 justify-center">
          <Repeat2 className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-600">Repost</span>
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors flex-1 justify-center">
          <Send className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-600">Send</span>
        </button>
      </div>

      {/* Character Count Footer */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn(
            'font-medium',
            characterCount > 3000 ? 'text-red-600' : characterCount > 2700 ? 'text-orange-600' : 'text-gray-500'
          )}>
            {characterCount} / 3,000
          </span>
          <span className={cn(
            'text-[10px] font-medium',
            characterCount > 3000 ? 'text-red-600' : characterCount > 2700 ? 'text-orange-600' : 'text-green-600'
          )}>
            {characterCount > 3000 && '⚠ Exceeds limit'}
            {characterCount > 2700 && characterCount <= 3000 && '⚡ Near limit'}
            {characterCount <= 2700 && '✓ Good'}
          </span>
        </div>
      </div>
    </div>
  );
}
