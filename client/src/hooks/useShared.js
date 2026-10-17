import { useEffect, useState } from 'react';

// Data many screens show at once (notification bell, unread chats, admin badges) kept in one
// place: one request no matter how many components use it, no new request when a page
// changes if the data is still fresh, and one timer refreshing it while the tab is visible.
const stores = new Map(); // key -> { data, at, inFlight, subs, timer, fetcher, every }

function store(key) {
  if (!stores.has(key)) stores.set(key, { data: undefined, at: 0, inFlight: null, subs: new Set(), timer: null });
  return stores.get(key);
}

function publish(s) {
  s.subs.forEach((set) => set(s.data));
}

// Fetches now (one request even if several components ask at the same moment).
export function refreshShared(key) {
  const s = store(key);
  if (!s.fetcher) return Promise.resolve(s.data);
  if (!s.inFlight) {
    s.inFlight = s
      .fetcher()
      .then((data) => {
        s.data = data;
        s.at = Date.now();
        publish(s);
        return data;
      })
      .catch(() => s.data)
      .finally(() => {
        s.inFlight = null;
      });
  }
  return s.inFlight;
}

// Changes the shared data right away (e.g. "mark all read"), for every component using it.
export function setShared(key, update) {
  const s = store(key);
  s.data = typeof update === 'function' ? update(s.data) : update;
  publish(s);
}

// Forgets everything (on logout), so the next account never sees the previous one's data.
export function resetShared() {
  for (const s of stores.values()) {
    clearInterval(s.timer);
    s.timer = null;
    s.data = undefined;
    s.at = 0;
  }
}

const onVisible = () => {
  if (document.visibilityState !== 'visible') return;
  for (const [key, s] of stores) if (s.subs.size && Date.now() - s.at > s.every / 2) refreshShared(key);
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);

// [data, refresh] for `key`. `fetcher` returns a promise of the data; `every` is the refresh
// interval in ms. Data younger than `every` is reused as it is.
export function useShared(key, fetcher, every) {
  const s = store(key);
  s.fetcher = fetcher;
  s.every = every;
  const [data, setData] = useState(s.data);

  useEffect(() => {
    s.subs.add(setData);
    setData(s.data);
    if (Date.now() - s.at > every) refreshShared(key);
    if (!s.timer) {
      s.timer = setInterval(() => document.visibilityState === 'visible' && refreshShared(key), every);
    }
    return () => {
      s.subs.delete(setData);
      // Stop the timer a moment after the last user leaves, unless the next page picks it up.
      setTimeout(() => {
        if (!s.subs.size && s.timer) {
          clearInterval(s.timer);
          s.timer = null;
        }
      }, 1000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, every]);

  return [data, () => refreshShared(key)];
}
