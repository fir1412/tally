// A brand-new visitor in a browser tab sees the landing page first (start.html): what Tally is and how to start; its
// "Open Tally" comes back as ./?app. Never the installed app, anyone who has opened Tally here before (the look is
// saved on every open), a link with anything in it (?app, a shared file, a sample), or a window where storage is blocked.
// A classic script in <head>, so it runs before anything is drawn (the CSP allows no inline script).
(() => {
  try {
    if (location.search || location.hash) return;
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    if (localStorage.getItem('tally-look') !== null) return;
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;
    location.replace('start.html');
  } catch { /* storage blocked: stay in the app */ }
})();
