/**
 * Template Categories
 * Predefined categories for organizing public templates
 */
export const TEMPLATE_CATEGORIES = {
  CONTENT_CREATION: 'Content Creation',
  RESEARCH_ANALYSIS: 'Research & Analysis',
  EDUCATION_LEARNING: 'Education & Learning',
  BUSINESS_MARKETING: 'Business & Marketing',
  OTHER: 'Other',
} as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[keyof typeof TEMPLATE_CATEGORIES];

/**
 * Get all template categories as an array
 */
export function getTemplateCategories(): TemplateCategory[] {
  return Object.values(TEMPLATE_CATEGORIES);
}

/**
 * Template filter state for UI
 */
export interface TemplateFilters {
  category?: TemplateCategory | 'all';
  search?: string;
}
