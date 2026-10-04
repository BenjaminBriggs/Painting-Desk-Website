// App Store release switch (SPEC.md §6.4). Until the app is live there is no App Store page to link to, so every
// App Store link sends people to the public TestFlight beta instead, and copy that only holds before launch is swapped.
// Launch day: set APP_RELEASED to true.
const APP_RELEASED = false;
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/u1uGEpJv';

// Markup hooks, used only while unreleased:
//   data-beta="text"  replaces the element's text
//                     (App Store links without it read "Join the TestFlight beta")
function applyReleaseState() {
  if (APP_RELEASED) return;

  document.querySelectorAll('[data-beta]').forEach((element) => {
    element.textContent = element.dataset.beta;
  });

  document.querySelectorAll('a[href*="apps.apple.com"]').forEach((link) => {
    link.href = TESTFLIGHT_URL;
    if (link.dataset.beta === undefined) link.textContent = 'Join the TestFlight beta';
  });
}

// The header arrives through includes.js, so wait for it before rewriting links.
document.addEventListener('includes-loaded', applyReleaseState);
