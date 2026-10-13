import { useCallback, useEffect } from 'react';

// Keeps unsaved form input in sessionStorage so a page refresh doesn't wipe it. It holds
// personal details (phone, salary), so it goes away when the tab is closed or on logout.
// Storage can be unavailable (private mode, blocked), so every access is guarded.
export function readDraft(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? null;
  } catch {
    return null;
  }
}

export function useDraft(key, value) {
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore: the form still works, it just won't survive a refresh
    }
  }, [key, value]);

  return useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);
}

// Drafts belong to one user; clear them all on logout so the next person
// on the same computer doesn't see them (older versions kept them in localStorage).
export function clearAllDrafts() {
  for (const store of ['sessionStorage', 'localStorage']) {
    try {
      Object.keys(window[store])
        .filter((k) => k.startsWith('swipehire_draft_'))
        .forEach((k) => window[store].removeItem(k));
    } catch {
      // ignore
    }
  }
}

export const draftKey = (user, name, editing) => `swipehire_draft_${name}_${user?.id}${editing ? '_edit' : ''}`;

