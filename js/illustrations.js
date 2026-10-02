// The landing page's drawn screens, where they move like the app. Nothing here moves for anyone who has asked
// for reduced motion; the page is drawn in its finished state and every effect starts from it.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Runs `action` once, the first time `element` is well inside the viewport.
function whenSeen(element, action) {
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      action();
    }
  }, { threshold: 0.35 }).observe(element);
}

// The hero: one model, Sprue to Done. The finished photo is drawn first; the other four load after it, play
// through once, and from then on the stage row shows whichever stage is tapped.
const stageButtons = [...document.querySelectorAll('[data-stage]')];
const stagePhotos = [...document.querySelectorAll('[data-stage-photo]')];
const stageStamp = document.querySelector('[data-stage-stamp]');
let stageTimers = [];

function showStage(name) {
  stageButtons.forEach((button) => {
    const isCurrent = button.textContent === name;
    button.classList.toggle('is-current', isCurrent);
    button.setAttribute('aria-pressed', String(isCurrent));
  });
  stagePhotos.forEach((photo) => photo.classList.toggle('is-shown', photo.dataset.stagePhoto === name));
  stageStamp.textContent = name;
}

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    stageTimers.forEach(clearTimeout);
    stageTimers = [];
    showStage(button.textContent);
  });
});

if (stagePhotos.length > 0) {
  stagePhotos.forEach((photo) => {
    photo.src = photo.dataset.src;
  });
  if (reduceMotion === false) {
    Promise.all(stagePhotos.map((photo) => photo.decode().catch(() => {}))).then(() => {
      stageButtons.forEach((button, i) => {
        stageTimers.push(setTimeout(() => showStage(button.textContent), 400 + i * 1200));
      });
    });
  }
}

// The hero's iPhone: the app's screens in turn, every three seconds, only while the phone is on screen and the
// tab is in front. The first screen is the page's own; the rest load after it.
const phoneScreens = [...document.querySelectorAll('[data-phone-screen]')];

if (phoneScreens.length > 1) {
  const overlays = phoneScreens.slice(1);
  overlays.forEach((screen) => {
    screen.src = screen.dataset.src;
  });

  if (reduceMotion === false) {
    let current = 0;
    let timer = null;
    let inView = false;
    const advance = () => {
      current = (current + 1) % phoneScreens.length;
      overlays.forEach((screen, i) => screen.classList.toggle('is-shown', i + 1 === current));
    };
    const update = () => {
      const shouldRun = inView && document.hidden === false;
      if (shouldRun && timer === null) timer = setInterval(advance, 3000);
      if (shouldRun === false && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      update();
    }).observe(phoneScreens[0]);
    document.addEventListener('visibilitychange', update);
  }
}

// The painting clock counts up from the time it is drawn at, as a running session does.
if (reduceMotion === false) {
  document.querySelectorAll('[data-painting-clock]').forEach((paintingClock) => {
    const startedAt = Date.now() - Number(paintingClock.dataset.paintingClock) * 1000;
    setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, '0');
      paintingClock.textContent = `${Math.floor(seconds / 3600)}:${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
  });
}

// The photo prompt names whichever stage the selector is moved to.
document.querySelectorAll('input[name="stage"]').forEach((input) => {
  input.addEventListener('change', () => {
    const stage = document.querySelector(`label[for="${input.id}"]`).textContent;
    document.querySelectorAll('[data-stage-name]').forEach((element) => {
      element.textContent = stage;
    });
  });
});

// The rack: each pot fills to its level, left to right, when the shelf comes into view.
const shelf = document.querySelector('[data-fill-shelf]');

if (shelf && reduceMotion === false) {
  const frame = 1400;
  const fills = [...shelf.querySelectorAll('[data-fill]')].map((rect) => {
    const level = Number(rect.getAttribute('y'));
    rect.setAttribute('y', frame);
    rect.setAttribute('height', 0);
    return { rect, level };
  });
  whenSeen(shelf, () => {
    const startedAt = performance.now();
    const duration = 900;
    const step = (now) => {
      let running = false;
      fills.forEach(({ rect, level }, i) => {
        const t = Math.min(1, Math.max(0, (now - startedAt - i * 70) / duration));
        const eased = 1 - (1 - t) ** 3;
        const y = frame - (frame - level) * eased;
        rect.setAttribute('y', y);
        rect.setAttribute('height', frame - y);
        if (t < 1) running = true;
      });
      if (running) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Stats: the bars grow from the baseline and the year's count climbs to its number.
const bars = document.querySelector('[data-bars]');
const count = document.querySelector('[data-count-to]');

if (bars && reduceMotion === false) {
  bars.querySelectorAll('.bar').forEach((bar, i) => bar.style.setProperty('--i', i));
  bars.classList.add('is-waiting');
  whenSeen(bars, () => bars.classList.remove('is-waiting'));
}

if (count && reduceMotion === false) {
  const target = Number(count.dataset.countTo);
  count.textContent = '0';
  whenSeen(count, () => {
    const startedAt = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startedAt) / 1100);
      count.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
