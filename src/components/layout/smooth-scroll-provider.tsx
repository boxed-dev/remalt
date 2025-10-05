'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from '@studio-freight/lenis';

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const frameRef = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Disable smooth scroll on workflow pages (they need full control for canvas panning)
    const isWorkflowPage = pathname?.startsWith('/flows/');
    if (isWorkflowPage) {
      return;
    }

    const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let resizeHandler: (() => void) | null = null;

    const cancelRaf = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const destroyLenis = () => {
      cancelRaf();
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      document.documentElement.classList.remove('lenis-enabled');
      document.documentElement.style.removeProperty('scroll-behavior');
    };

    const startLenis = () => {
      if (lenisRef.current) {
        return;
      }

      const lenis = new Lenis({
        duration: 0.95,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        smoothTouch: false,
        syncTouch: true,
        touchMultiplier: 1.25,
      });

      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        frameRef.current = requestAnimationFrame(raf);
      };

      frameRef.current = requestAnimationFrame(raf);
      resizeHandler = () => lenis.resize();
      window.addEventListener('resize', resizeHandler);
      document.documentElement.classList.add('lenis-enabled');
      document.documentElement.style.setProperty('scroll-behavior', 'auto');
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        destroyLenis();
        document.documentElement.classList.add('lenis-reduced');
      } else {
        document.documentElement.classList.remove('lenis-reduced');
        startLenis();
      }
    };

    if (!prefersReducedMotionQuery.matches) {
      startLenis();
    } else {
      document.documentElement.classList.add('lenis-reduced');
    }

    prefersReducedMotionQuery.addEventListener('change', handleMotionPreferenceChange);

    return () => {
      prefersReducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange);
      destroyLenis();
      document.documentElement.classList.remove('lenis-reduced');
    };
  }, [pathname]);

  return <>{children}</>;
}
