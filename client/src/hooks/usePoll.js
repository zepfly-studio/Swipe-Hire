import { useEffect, useRef } from 'react';

// Calls `fn` now and then every `ms` while the tab is visible (and again when the
// user comes back to the tab). Used for chat, notifications and unread counts.
export function usePoll(fn, ms, deps = []) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    let stopped = false;
    const run = () => !stopped && document.visibilityState === 'visible' && saved.current();
    run();
    const t = setInterval(run, ms);
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
