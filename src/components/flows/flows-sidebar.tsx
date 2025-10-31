'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FlowsSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Your Workflows',
      href: '/flows',
      icon: LayoutGrid,
      active: pathname === '/flows',
    },
    {
      title: 'Templates',
      href: '/templates',
      icon: Sparkles,
      active: pathname === '/templates',
    },
  ];

  return (
    <aside className="w-64 h-[calc(100vh-56px)] border-r border-[#E8ECEF] bg-white sticky top-14 flex-shrink-0">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all duration-150',
                item.active
                  ? 'bg-[#095D40] text-white shadow-sm'
                  : 'text-[#6B7280] hover:bg-[#F5F5F7] hover:text-[#095D40]'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
