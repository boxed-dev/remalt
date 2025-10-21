import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to track page visibility state
 * Prevents unnecessary work when user switches tabs
 * 
 * @returns {boolean} isVisible - Whether the page is currently visible
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook to detect when user returns to the tab after being away
 * Useful for conditionally refreshing data only when needed
 * 
 * @param callback - Function to call when user returns to tab
 * @param minAwayTime - Minimum time (ms) user must be away before callback is triggered (default: 5000ms)
 */
export function useTabReturn(
  callback: () => void,
  minAwayTime: number = 5000
) {
  const [lastHiddenTime, setLastHiddenTime] = useState<number | null>(null);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab became hidden
      setLastHiddenTime(Date.now());
    } else {
      // Tab became visible
      if (lastHiddenTime && Date.now() - lastHiddenTime >= minAwayTime) {
        callback();
      }
      setLastHiddenTime(null);
    }
  }, [callback, lastHiddenTime, minAwayTime]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}
