import { cloneElement, isValidElement } from 'react';
import type { CSSProperties, PointerEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  extractRGB,
  getNodeHeaderTheme,
  type NodeHeaderTheme,
} from './nodeThemes';

interface NodeHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  themeKey?: string | null;
  theme?: NodeHeaderTheme;
  className?: string;
  isDraggable?: boolean;
  onPointerDownCapture?: PointerEventHandler<HTMLDivElement>;
}

export function NodeHeader({
  title,
  subtitle,
  icon,
  trailing,
  actions,
  themeKey,
  theme,
  className,
  isDraggable = true,
  onPointerDownCapture,
}: NodeHeaderProps) {
  const resolvedTheme = theme ?? getNodeHeaderTheme(themeKey ?? undefined);

  const style: (CSSProperties & Record<string, string>) = {
    '--node-header-accent-rgb': extractRGB(resolvedTheme.accent),
    '--node-header-text-color': resolvedTheme.textColor,
    '--node-header-muted-color': resolvedTheme.mutedText,
    '--node-header-icon-bg': resolvedTheme.iconBackground,
    '--node-header-icon-color': resolvedTheme.iconColor,
    '--node-header-surface': resolvedTheme.surface,
    '--node-header-surface-hover': resolvedTheme.surfaceHover,
    '--node-header-surface-active': resolvedTheme.surfaceActive,
    backgroundColor: resolvedTheme.surface,
    boxShadow: `0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)`,
    borderBottom: `1px solid ${resolvedTheme.border}`,
  };

  const renderedIcon = icon && isValidElement(icon)
    ? cloneElement(icon, {
        className: cn('h-4 w-4', (icon.props as { className?: string })?.className),
        style: {
          color: resolvedTheme.iconColor,
          ...(icon.props as { style?: CSSProperties })?.style,
        },
      })
    : icon;

  return (
    <div
      className={cn(
        'flowy-node-header relative z-10 flex h-[44px] items-center justify-between gap-2 rounded-t-2xl px-4 py-2 select-none transition-colors duration-150',
        isDraggable && 'flowy-drag-handle cursor-grab active:cursor-grabbing',
        className,
      )}
      style={style}
      data-flowy-drag-handle={isDraggable ? true : undefined}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        {icon && (
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{
              background: resolvedTheme.iconBackground,
              color: resolvedTheme.iconColor,
            }}
          >
            {renderedIcon}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="truncate text-[12px] font-semibold leading-[1.15] tracking-tight"
            style={{ color: resolvedTheme.textColor }}
            title={typeof title === 'string' ? title : undefined}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className="truncate text-[10px] font-medium leading-[1.25]"
              style={{ color: resolvedTheme.mutedText }}
              title={typeof subtitle === 'string' ? subtitle : undefined}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {(trailing || actions) && (
        <div className="flex items-center justify-end gap-1.5 text-[11px] font-medium flex-shrink-0 whitespace-nowrap">
          {trailing}
          {actions}
        </div>
      )}
    </div>
  );
}

type BadgeTone = 'accent' | 'muted' | 'success' | 'danger' | 'warning';

export function NodeHeaderBadge({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const toneStyles: Record<BadgeTone, { background: string; color: string }> = {
    accent: {
      background: 'rgba(var(--node-header-accent-rgb), 0.12)',
      color: 'rgba(var(--node-header-accent-rgb), 0.85)',
    },
    muted: {
      background: 'rgba(var(--node-header-accent-rgb), 0.06)',
      color: 'var(--node-header-muted-color)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.12)',
      color: '#047857',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.12)',
      color: '#B91C1C',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.14)',
      color: '#92400E',
    },
  };

  const { background, color } = toneStyles[tone];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-medium"
      style={{ background, color }}
    >
      {children}
    </span>
  );
}
