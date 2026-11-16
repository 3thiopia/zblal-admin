import { useCallback, useEffect, useState } from 'react';

export type ViewMode = 'cards' | 'table';

const STORAGE_PREFIX = 'zblal_view_mode:';
const DESKTOP_BREAKPOINT = 1024;

function getDefaultViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  return window.innerWidth >= DESKTOP_BREAKPOINT ? 'table' : 'cards';
}

function readStoredViewMode(pageKey: string): ViewMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${pageKey}`);
    if (saved === 'cards' || saved === 'table') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }
  return null;
}

export function useResponsiveViewMode(pageKey: string) {
  const [hasExplicitPreference, setHasExplicitPreference] = useState<boolean>(
    () => readStoredViewMode(pageKey) !== null
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => readStoredViewMode(pageKey) ?? getDefaultViewMode()
  );

  useEffect(() => {
    const saved = readStoredViewMode(pageKey);
    if (saved) {
      setHasExplicitPreference(true);
      setViewModeState(saved);
    } else {
      setHasExplicitPreference(false);
      setViewModeState(getDefaultViewMode());
    }
  }, [pageKey]);

  useEffect(() => {
    if (hasExplicitPreference || typeof window === 'undefined') return;
    const handleResize = () => {
      setViewModeState(getDefaultViewMode());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasExplicitPreference]);

  const setViewMode = useCallback(
    (nextMode: ViewMode) => {
      setHasExplicitPreference(true);
      setViewModeState(nextMode);
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${pageKey}`, nextMode);
      } catch {
        // Ignore storage write errors in restricted contexts
      }
    },
    [pageKey]
  );

  return [viewMode, setViewMode] as const;
}
