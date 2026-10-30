'use client';

import { useEffect, useSyncExternalStore } from 'react';

const THEME_KEY = 'panel-theme';

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

export function usePanelTheme() {
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const saved = readTheme();
      document.documentElement.classList.toggle(
        'dark',
        saved === 'dark' || (saved !== 'light' && media.matches),
      );
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) applyTheme();
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    window.addEventListener('storage', syncStorage);
    return () => {
      media.removeEventListener('change', applyTheme);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }

  return { isDark, toggleTheme };
}
