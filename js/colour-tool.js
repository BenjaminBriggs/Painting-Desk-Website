// The landing page's colour tool: the app's ramp and harmonies (ColourEngine in ../Plinth), matched against the
// catalogue in /data/paints.json (built by tools/paints.py). Same maths and thresholds as the app, so what a
// visitor sees here is what the app would answer from the same paints.

const colourTool = document.querySelector('[data-colour-tool]');

const CLOSE = 2; // ColourEngine.closeThreshold
const NEAR = 5; // ColourEngine.nearThreshold
const COOL_HUE = 264; // OKLCH blue
const WARM_HUE = 80; // OKLCH yellow
const HARMONIES = {
  complementary: { rotations: [180], titles: ['Complement'] },
  split: { rotations: [150, 210], titles: ['Split 1', 'Split 2'] },
  triad: { rotations: [120, 240], titles: ['Triad 1', 'Triad 2'] },
  analogous: { rotations: [-30, 30], titles: ['Analogous 1', 'Analogous 2'] },
};

// ---------- OKLab, as Lab.swift ----------

function hexToLab(hex) {
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function labToHex({ l, a, b }) {
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const gamma = (c) => {
    const v = Math.min(Math.max(c, 0), 1);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return rgb.map((c) => Math.round(gamma(c) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

const toLCH = ({ l, a, b }) => ({ l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 });
const fromLCH = ({ l, c, h }) => ({ l, a: c * Math.cos((h * Math.PI) / 180), b: c * Math.sin((h * Math.PI) / 180) });
const distance = (x, y) => Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b) * 100;

// ---------- Ramps and harmonies, as ColourEngine.swift ----------

function towards(from, target) {
  let delta = (target - from) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta >= 0 ? 1 : -1;
}

function ramp(base, hueShift) {
  const { l, c, h } = toLCH(base);
  const cool = towards(h, COOL_HUE);
  const warm = towards(h, WARM_HUE);
  const shadow = (k) => fromLCH({ l: Math.max(0, l - 0.08 * k), c: Math.min(0.4, c + 0.02 * k), h: h + cool * hueShift * k });
  const highlight = (k) => fromLCH({ l: Math.min(1, l + 0.08 * k), c: Math.max(0, c - 0.02 * k), h: h + warm * hueShift * k });
  return [
    { title: 'Shadow 2', lab: shadow(2) },
    { title: 'Shadow 1', lab: shadow(1) },
    { title: 'Base', lab: base, isBase: true },
    { title: 'Highlight 1', lab: highlight(1) },
    { title: 'Highlight 2', lab: highlight(2) },
  ];
}

function harmony(kind, base) {
  const { l, c, h } = toLCH(base);
  const { rotations, titles } = HARMONIES[kind];
  return [{ title: 'Base', lab: base, isBase: true }].concat(
    rotations.map((rotation, i) => ({ title: titles[i], lab: fromLCH({ l, c, h: h + rotation }) })),
  );
}

// ---------- The catalogue ----------

let catalogue = null;

async function loadCatalogue() {
  if (catalogue) return catalogue;
  const response = await fetch('/data/paints.json');
  const { ranges, paints } = await response.json();
  catalogue = paints.map(([range, name, hex]) => {
    const [brand, rangeName, shape, cap] = ranges[range];
    return { name, brand, range: rangeName, hex, shape, cap, lab: hexToLab(hex) };
  });
  return catalogue;
}

function nearest(lab) {
  let best = null;
  let bestDistance = Infinity;
  for (const paint of catalogue) {
    const d = distance(paint.lab, lab);
    if (d < bestDistance) {
      best = paint;
      bestDistance = d;
    }
  }
  return { paint: best, deltaE: bestDistance };
}

const band = (deltaE) => (deltaE < CLOSE ? 'Close' : deltaE < NEAR ? 'Near' : 'Different');

// ---------- Markup, the same as the rows drawn into the page ----------

const escapeHTML = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function pot(paint, classes) {
  const use = `/images/pots.svg#${paint.shape}`;
  return `<svg class="pot ${classes}" viewBox="0 0 1400 1400" aria-hidden="true"><use href="${use}-paint" fill="#E0E0DC"/><use href="${use}-paint" fill="#${paint.hex}"/><use href="${use}-cap" fill="#${paint.cap}"/><use href="${use}-overlay" opacity=".25"/></svg>`;
}

function row(step, match, index) {
  const { paint, deltaE } = match;
  const words = band(deltaE);
  return `<li class="entity-row row-in" style="animation-delay:${index * 60}ms">
    <span class="flex-none w-[4.25rem]"><span class="block h-9 rounded-[3px]" style="background:#${labToHex(step.lab)}"></span><span class="meta block mt-1 text-[0.5625rem] text-center">${step.title}</span></span>
    ${pot(paint, 'w-9 h-9 flex-none')}
    <span class="flex-1 min-w-0"><span class="block font-serif text-[1.3rem] leading-none truncate">${escapeHTML(paint.name)}</span><span class="meta block truncate mt-1">${escapeHTML(paint.brand)} · ${escapeHTML(paint.range)}</span></span>
    <span class="flex-none text-right"><span class="block font-serif text-xl leading-none"><span class="text-xs text-muted">ΔE</span> ${deltaE.toFixed(1)}</span><span class="meta block mt-1${words === 'Different' ? ' meta-accent' : ''}">${words}</span></span>
  </li>`;
}

// ---------- The tool ----------

if (colourTool) {
  const header = colourTool.querySelector('[data-colour-base]');
  const rows = colourTool.querySelector('[data-colour-rows]');
  const modes = colourTool.querySelectorAll('[data-mode]');
  const hueShiftControl = colourTool.querySelector('[data-hue-shift]');
  const hueShiftValue = colourTool.querySelector('[data-hue-shift-value]');
  const hueShiftRow = colourTool.querySelector('[data-hue-shift-row]');
  const presets = document.querySelectorAll('[data-preset]');
  const anyColour = document.querySelector('[data-any-colour]');

  // The base is a paint from a preset, or a bare colour from the picker or the photo.
  let base = null;
  let mode = 'ramp';
  let hueShift = 12;

  function drawHeader() {
    const leading = base.paint
      ? pot(base.paint, 'w-12 h-12 flex-none')
      : `<span class="flex-none w-12 h-12 rounded-[3px] border border-border" style="background:#${base.hex}"></span>`;
    header.innerHTML = `${leading}<div><p class="font-serif text-[1.6rem] leading-none mb-1">${escapeHTML(base.title)}</p><p class="meta">${escapeHTML(base.meta)}</p></div>`;
  }

  async function draw() {
    drawHeader();
    hueShiftRow.hidden = mode !== 'ramp';
    await loadCatalogue();
    const lab = base.paint ? base.paint.lab : hexToLab(base.hex);
    const steps = mode === 'ramp' ? ramp(lab, hueShift) : harmony(mode, lab);
    rows.innerHTML = steps
      .map((step, i) => row(step, step.isBase && base.paint ? { paint: base.paint, deltaE: 0 } : nearest(step.lab), i))
      .join('');
  }

  function choosePreset(button) {
    presets.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    const { name, brand, range, hex, shape, cap } = button.dataset;
    const paint = { name, brand, range, hex, shape, cap, lab: hexToLab(hex) };
    base = { paint, title: name, meta: `${brand} · ${range}` };
    draw();
  }

  function chooseColour(hex, meta) {
    presets.forEach((other) => other.setAttribute('aria-pressed', 'false'));
    base = { hex, title: meta === 'Sampled from the photo' ? 'From the photo' : 'Your colour', meta: `#${hex} · ${meta}` };
    draw();
  }

  presets.forEach((button) => button.addEventListener('click', () => choosePreset(button)));

  anyColour?.addEventListener('input', () => chooseColour(anyColour.value.slice(1).toUpperCase(), 'Picked'));

  modes.forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.mode;
      modes.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      draw();
    });
  });

  hueShiftControl?.addEventListener('input', () => {
    hueShift = Number(hueShiftControl.value);
    hueShiftValue.textContent = `${hueShift}°`;
    draw();
  });

  // The page draws Orange Rust's ramp already; start from the same preset.
  const first = document.querySelector('[data-preset][aria-pressed="true"]');
  const { name, brand, range, hex, shape, cap } = first.dataset;
  base = { paint: { name, brand, range, hex, shape, cap, lab: hexToLab(hex) }, title: name, meta: `${brand} · ${range}` };

  // Fetch the catalogue before anyone reaches the tool, not on their first tap.
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadCatalogue();
      observer.disconnect();
    }
  }, { rootMargin: '800px' }).observe(colourTool);

  // The eyedropper: tap the hero photo and average a small region (spec §6.4: never a single pixel). The
  // colour goes into the tool below without moving the page; the hint on the photo offers the way down.
  const frame = document.querySelector('[data-eyedropper]');
  frame?.addEventListener('click', (event) => {
    // Whichever stage is showing: the topmost photo that has faded in, or the finished one beneath them.
    const photo = frame.querySelector('img.is-shown') ?? frame.querySelector('img');
    if (photo.complete === false || photo.naturalWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(photo, 0, 0);
    const bounds = frame.querySelector('img').getBoundingClientRect();
    const x = Math.round(((event.clientX - bounds.left) / bounds.width) * photo.naturalWidth);
    const y = Math.round(((event.clientY - bounds.top) / bounds.height) * photo.naturalHeight);
    const radius = 7;
    const { data } = context.getImageData(Math.max(0, x - radius), Math.max(0, y - radius), radius * 2 + 1, radius * 2 + 1);
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
    }
    const count = data.length / 4;
    const hex = sum.map((channel) => Math.round(channel / count).toString(16).padStart(2, '0')).join('').toUpperCase();

    // A drop of the sampled colour where the tap landed, then down to the tool.
    const drop = document.createElement('span');
    drop.className = 'sample-drop';
    drop.style.left = `${event.clientX - bounds.left}px`;
    drop.style.top = `${event.clientY - bounds.top}px`;
    drop.style.background = `#${hex}`;
    frame.append(drop);
    setTimeout(() => drop.remove(), 1400);

    chooseColour(hex, 'Sampled from the photo');

    // The page stays where it is: the hint becomes the colour taken and a link down to its paints.
    frame.querySelector('[data-sample-hint]').hidden = true;
    const result = frame.querySelector('[data-sample-result]');
    result.querySelector('[data-sample-swatch]').style.background = `#${hex}`;
    result.hidden = false;
  });

  // Following the link is not another sample.
  frame?.querySelector('[data-sample-result]')?.addEventListener('click', (event) => event.stopPropagation());
}
