'use client';

import { Badge } from '@/components/ui/badge';
import { User, Globe } from 'lucide-react';
import { PublicTemplateSummary } from '@/lib/supabase/workflows';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TemplateCardProps {
  template: PublicTemplateSummary;
  isAuthenticated: boolean;
}

export function TemplateCard({ template, isAuthenticated }: TemplateCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUseTemplate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Redirect to sign-in if not authenticated
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/templates?use=${template.id}`);
      return;
    }

    setIsLoading(true);

    try {
      // Duplicate the template workflow
      const response = await fetch('/api/workflows/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: template.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to use template');
      }

      const { workflow } = await response.json();

      // Redirect to the new workflow
      router.push(`/flows/${workflow.id}`);
    } catch (error) {
      console.error('Error using template:', error);
      alert('Failed to use template. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="group relative border border-[#E8ECEF] rounded-xl p-6 hover:border-[#095D40] hover:shadow-[0_4px_16px_rgba(9,93,64,0.12)] hover:-translate-y-1 transition-all duration-200 bg-white"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
      }}
    >
      {/* Public Badge - Top Right */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-[5]">
        <Badge className="bg-[#095D40] text-white hover:bg-[#074830] text-[10px] font-medium flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Public
        </Badge>
      </div>

      {/* Use Template Button - Shows on Hover */}
      <button
        onClick={handleUseTemplate}
        disabled={isLoading}
        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[#095D40] text-white text-[12px] font-medium opacity-0 group-hover:opacity-100 hover:bg-[#074830] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-[10]"
        title={isAuthenticated ? 'Use this template' : 'Sign in to use template'}
      >
        {isLoading ? 'Creating...' : 'Use Template'}
      </button>

      {/* Category Badge */}
      {template.metadata.category && (
        <div className="mb-3">
          <Badge
            variant="secondary"
            className="bg-[#D4AF7F]/10 text-[#8B7355] border-[#D4AF7F]/20 hover:bg-[#D4AF7F]/20 text-[11px] font-medium"
          >
            {template.metadata.category}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-[16px] mb-1 text-[#1A1D21] truncate group-hover:text-[#095D40] transition-colors">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-[13px] text-[#6B7280] line-clamp-2">{template.description}</p>
          )}
        </div>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-[#9CA3AF]" />
          <span className="text-[12px] text-[#6B7280] font-medium">
            {template.authorName || template.authorEmail.split('@')[0]}
          </span>
        </div>
      </div>

      {/* Tags */}
      {template.metadata.tags && template.metadata.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {template.metadata.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#6B7280] hover:bg-[#E8ECEF] transition-colors"
            >
              {tag}
            </span>
          ))}
          {template.metadata.tags.length > 3 && (
            <span className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#6B7280]">
              +{template.metadata.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
