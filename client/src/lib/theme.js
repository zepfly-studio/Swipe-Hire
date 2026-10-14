// Light (sky blue on white) and dark (pink/violet on near-black) themes. The choice is
// kept per browser; index.html applies it before the first paint so there's no flash.
const KEY = 'swipehire_theme';
const BG = { light: '#f3f7fc', dark: '#07070d' };

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[t]);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // storage blocked: the theme still applies for this visit
  }
  window.dispatchEvent(new CustomEvent('swipehire:theme', { detail: t }));
}
