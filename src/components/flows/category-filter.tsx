"use client";

interface Category {
  name: string;
  count: number | null;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onCategoryChange(cat.name)}
          className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all duration-150 ${
            activeCategory === cat.name
              ? "bg-[#1A1D21] text-white"
              : "bg-white text-[#6B7280] border border-[#E8ECEF] hover:border-[#1A1D21] hover:text-[#1A1D21]"
          }`}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif'
          }}
        >
          {cat.name}
          {cat.count !== null && (
            <span className="ml-2 opacity-70">{cat.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
