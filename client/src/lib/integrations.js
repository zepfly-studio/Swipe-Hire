// Third-party tools the admin switches on in Admin → Integrations (GET /api/site → integrations).
// Each one loads once; switching it off stops it where the provider allows, and it is gone
// on the next page load. Nothing loads on admin pages.

const loaded = new Map(); // key -> config string it was loaded with

function addScript(src, attrs = {}) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
  return s;
}

const START = {
  googleAnalytics: ({ id }) => {
    window[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  },
  googleTagManager: ({ id }) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
  },
  metaPixel: ({ id }) => {
    if (!window.fbq) {
      const n = (window.fbq = function fbq() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); // eslint-disable-line prefer-rest-params
      });
      window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      addScript('https://connect.facebook.net/en_US/fbevents.js');
    }
    window.fbq('consent', 'grant');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  },
  clarity: ({ id }) => {
    window.clarity =
      window.clarity ||
      function clarity() {
        (window.clarity.q = window.clarity.q || []).push(arguments); // eslint-disable-line prefer-rest-params
      };
    addScript(`https://www.clarity.ms/tag/${encodeURIComponent(id)}`);
  },
  tawk: ({ id }) => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    addScript(`https://embed.tawk.to/${id}`, { crossorigin: '*', charset: 'UTF-8' });
  },
  crisp: ({ id }) => {
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = id;
    addScript('https://client.crisp.chat/l.js');
  },
  // Admin-written code (super admins only). <script> tags are recreated so they run.
  custom: ({ code }) => {
    const box = document.createElement('div');
    box.innerHTML = code;
    for (const node of [...box.childNodes]) {
      if (node.nodeName === 'SCRIPT') {
        const s = document.createElement('script');
        for (const a of node.attributes) s.setAttribute(a.name, a.value);
        s.text = node.textContent;
        document.head.appendChild(s);
      } else if (node.nodeType === 1) {
        document.body.appendChild(node);
      }
    }
  },
};

// Best effort "off" for a tool that already loaded in this tab.
const STOP = {
  googleAnalytics: ({ id }) => {
    window[`ga-disable-${id}`] = true;
  },
  metaPixel: () => window.fbq?.('consent', 'revoke'),
  clarity: () => window.clarity?.('stop'),
  tawk: () => window.Tawk_API?.hideWidget?.(),
  crisp: () => window.$crisp?.push(['do', 'chat:hide']),
};
const SHOW_AGAIN = {
  googleAnalytics: ({ id }) => {
    window[`ga-disable-${id}`] = false;
  },
  metaPixel: () => window.fbq?.('consent', 'grant'),
  tawk: () => window.Tawk_API?.showWidget?.(),
  crisp: () => window.$crisp?.push(['do', 'chat:show']),
};

const isAdminPage = () => window.location.pathname.startsWith('/admin');

export function applyIntegrations(list = {}) {
  if (isAdminPage()) return;
  for (const key of Object.keys(START)) {
    const cfg = list[key];
    const sig = cfg ? JSON.stringify(cfg) : null;
    const was = loaded.get(key);
    if (sig && was === undefined) {
      try {
        START[key](cfg);
      } catch (err) {
        console.warn(`[integrations] ${key} failed`, err);
      }
      loaded.set(key, sig);
    } else if (sig && was === null) {
      SHOW_AGAIN[key]?.(cfg);
      loaded.set(key, sig);
    } else if (!sig && was) {
      STOP[key]?.(JSON.parse(was));
      loaded.set(key, null);
    }
  }
}

// Single-page app: tell the trackers about each new page.
export function trackPage(path) {
  if (isAdminPage()) return;
  if (loaded.get('googleAnalytics')) window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href });
  if (loaded.get('metaPixel')) window.fbq?.('track', 'PageView');
}
