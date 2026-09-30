// A brand-new visitor in a browser tab sees the landing page first: what Tally is and how to start, in their own
// language when the browser's first choice is Malay, Chinese or Tamil (start.ms/zh/ta.html), else start.html; its
// "Open Tally" comes back as ./?app. Never the installed app, anyone who has opened Tally here before (the look is
// saved on every open), a link with anything in it (?app, a shared file, a sample), or a window where storage is blocked.
// A classic script in <head>, so it runs before anything is drawn (the CSP allows no inline script).
(() => {
  try {
    if (location.search || location.hash) return;
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    if (localStorage.getItem('tally-look') !== null) return;
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;
    const lang = /^(ms|zh|ta)(-|$)/i.exec((navigator.languages && navigator.languages[0]) || navigator.language || '');
    location.replace(lang ? `start.${lang[1].toLowerCase()}.html` : 'start.html');
  } catch { /* storage blocked: stay in the app */ }
})();
