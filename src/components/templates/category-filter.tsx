'use client';

import { Button } from '@/components/ui/button';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/types/templates';

interface CategoryFilterProps {
  selectedCategory: TemplateCategory | 'all';
  onCategoryChange: (category: TemplateCategory | 'all') => void;
  templateCounts?: Record<string, number>;
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  templateCounts = {},
}: CategoryFilterProps) {
  const categories: Array<{ value: TemplateCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Templates' },
    ...Object.values(TEMPLATE_CATEGORIES).map((cat) => ({
      value: cat,
      label: cat,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const count = category.value === 'all'
          ? Object.values(templateCounts).reduce((sum, c) => sum + c, 0)
          : templateCounts[category.value] || 0;

        const isSelected = selectedCategory === category.value;

        return (
          <Button
            key={category.value}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.value)}
            className={
              isSelected
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'hover:bg-muted'
            }
          >
            {category.label}
            {count > 0 && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
