'use client';

import { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { TemplateCard } from '@/components/templates/template-card';
import { CategoryFilter } from '@/components/templates/category-filter';
import { PublicTemplateSummary } from '@/lib/supabase/workflows';
import type { TemplateCategory } from '@/types/templates';
import type { User } from '@supabase/supabase-js';

interface TemplatesClientProps {
  initialTemplates: PublicTemplateSummary[];
  currentUser: User | null;
}

export function TemplatesClient({ initialTemplates, currentUser }: TemplatesClientProps) {
  const [templates] = useState<PublicTemplateSummary[]>(initialTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  // Calculate template counts by category
  const templateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach((template) => {
      const category = template.metadata.category || 'Other';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  // Filter templates by category and search
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((template) => template.metadata.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.metadata.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] flex-1">
      {/* Main Content */}
      <main className="min-h-screen">
        <div className="w-full px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-[#095D40]" />
              <h1 className="text-[28px] font-bold text-[#1A1D21]">Public Templates</h1>
            </div>
            <p className="text-[15px] text-[#6B7280]">
              Discover and use AI-powered workflow templates created by the community
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#1A1D21] text-sm bg-white transition-all duration-150"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              templateCounts={templateCounts}
            />
          </div>

          {/* Templates Grid */}
          {templates.length > 0 ? (
            <>
              {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-4 gap-5">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isAuthenticated={!!currentUser}
                    />
                  ))}
                </div>
              ) : (
                /* Empty Search/Filter Results */
                <div className="text-center py-20">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                      <Search className="h-8 w-8 text-[#9CA3AF]" />
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#1A1D21] mb-2">
                      No templates found
                    </h3>
                    <p className="text-[14px] text-[#6B7280] mb-6">
                      {searchQuery
                        ? 'Try adjusting your search or filter to find what you need'
                        : 'No templates available in this category'}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="px-4 py-2 rounded-lg border border-[#E8ECEF] text-[13px] font-medium text-[#1A1D21] hover:bg-[#F5F5F7] transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State - No Templates at All */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-[#9CA3AF]" />
              </div>
              <h2 className="text-[24px] font-bold text-[#1A1D21] mb-2">No templates yet</h2>
              <p className="text-[15px] text-[#6B7280] max-w-md text-center">
                Public templates will appear here once they are published by administrators.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
