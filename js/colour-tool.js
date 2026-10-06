// The landing page's colour tool: the app's ramp (ColourEngine and Studio/RampSection in ../Plinth), matched against the
// catalogue in /data/paints.json (built by tools/paints.py). Same maths and thresholds as the app, so what a
// visitor sees here is what the app would answer from the same paints.

const colourTool = document.querySelector('[data-colour-tool]');

const CLOSE = 2; // ColourEngine.closeThreshold
const NEAR = 5; // ColourEngine.nearThreshold
const COOL_HUE = 264; // OKLCH blue
const WARM_HUE = 80; // OKLCH yellow

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

const toLCH = ({ l, a, b }) => ({ l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 });
const fromLCH = ({ l, c, h }) => ({ l, a: c * Math.cos((h * Math.PI) / 180), b: c * Math.sin((h * Math.PI) / 180) });
const distance = (x, y) => Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b) * 100;

// ---------- The ramp, as ColourEngine.swift ----------

function towards(from, target) {
  let delta = (target - from) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta >= 0 ? 1 : -1;
}

// Darkest first, the base in the middle, lightest last. Settings as RampSettings: steps either side, and per step
// lightness (OKLab L), chroma, and degrees of hue towards cool for shadows and warm for highlights.
function ramp(base, settings) {
  const { l, c, h } = toLCH(base);
  const cool = towards(h, COOL_HUE);
  const warm = towards(h, WARM_HUE);
  const { shadows, highlights, lStep, cStep, hueShift } = settings;
  const steps = [];
  for (let k = shadows; k >= 1; k--) {
    steps.push({ title: `Shadow ${k}`, lab: fromLCH({ l: Math.max(0, l - lStep * k), c: Math.min(0.4, c + cStep * k), h: h + cool * hueShift * k }) });
  }
  steps.push({ title: 'Base', lab: base, isBase: true });
  for (let k = 1; k <= highlights; k++) {
    steps.push({ title: `Highlight ${k}`, lab: fromLCH({ l: Math.min(1, l + lStep * k), c: Math.max(0, c - cStep * k), h: h + warm * hueShift * k }) });
  }
  return steps;
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

// A step as SlotRows draws it: the step's name above, then the paint's row with its ΔE badge (DeltaEBadge), the
// number in its band's colour. The band's word is there for screen readers, as the app's VoiceOver label says it.
function row(step, match, index, animate) {
  const { paint, deltaE } = match;
  const word = band(deltaE);
  const arrival = animate ? ` class="row-in" style="animation-delay:${index * 60}ms"` : '';
  return `<li${arrival}>
    <p class="step-label">${step.title}</p>
    <div class="ramp-row">
      ${pot(paint, 'w-[2.875rem] h-[2.875rem] flex-none')}
      <span class="flex-1 min-w-0"><span class="block font-serif text-[1.3125rem] leading-tight truncate">${escapeHTML(paint.name)}</span><span class="meta block truncate">${escapeHTML(paint.brand)} · ${escapeHTML(paint.range)}</span></span>
      <span class="delta-e is-${word.toLowerCase()}">${deltaE.toFixed(1)}<span class="sr-only"> ΔE, ${word.toLowerCase()}</span></span>
    </div>
  </li>`;
}

// ---------- The tool ----------

if (colourTool) {
  const header = colourTool.querySelector('[data-colour-base]');
  const rows = colourTool.querySelector('[data-colour-rows]');
  const presets = document.querySelectorAll('[data-preset]');

  // The base is a paint from a preset, or a bare colour from a picker or the photo. The settings start at the app's
  // defaults; the page moves only the shift, always two steps either side.
  let base = null;
  const settings = { shadows: 2, highlights: 2, lStep: 0.08, cStep: 0.02, hueShift: 12 };

  function drawHeader() {
    const leading = base.paint
      ? pot(base.paint, 'w-[2.875rem] h-[2.875rem] flex-none')
      : `<span class="flex-none w-[2.875rem] h-[2.875rem] rounded-[3px] border border-border" style="background:#${base.hex}"></span>`;
    header.innerHTML = `${leading}<div class="min-w-0"><p class="font-serif text-[1.3125rem] leading-tight truncate">${escapeHTML(base.title)}</p><p class="meta truncate">${escapeHTML(base.meta)}</p></div>`;
  }

  // Rows arrive one after another for a new base; a setting moved redraws them in place, or a slider would replay
  // the arrival on every frame.
  async function draw(animate) {
    drawHeader();
    await loadCatalogue();
    const lab = base.paint ? base.paint.lab : hexToLab(base.hex);
    // A preset is in the catalogue, so the library answers its base with itself.
    rows.innerHTML = ramp(lab, settings)
      .map((step, i) => row(step, step.isBase && base.paint ? { paint: base.paint, deltaE: 0 } : nearest(step.lab), i, animate))
      .join('');
  }

  // ---------- The shift per step, as RampToolbar's Shift group ----------

  // Each value in its own unit: lightness in percent of the scale, chroma in hundredths, hue in degrees.
  const shown = {
    lStep: () => `${Math.round(settings.lStep * 100)}%`,
    cStep: () => `${Math.round(settings.cStep * 100)}`,
    hueShift: () => `${settings.hueShift}°`,
  };

  colourTool.querySelectorAll('[data-shift]').forEach((slider) => {
    const key = slider.dataset.shift;
    slider.addEventListener('input', () => {
      settings[key] = Number(slider.value);
      colourTool.querySelector(`[data-shift-value="${key}"]`).textContent = shown[key]();
      draw(false);
    });
  });

  // ---------- Choosing the base ----------

  function choosePreset(button) {
    presets.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    const { name, brand, range, hex, shape, cap } = button.dataset;
    const paint = { name, brand, range, hex, shape, cap, lab: hexToLab(hex) };
    base = { paint, title: name, meta: `${brand} · ${range}` };
    draw(true);
  }

  function chooseColour(hex, meta) {
    presets.forEach((other) => other.setAttribute('aria-pressed', 'false'));
    base = { hex, title: meta === 'Sampled from the photo' ? 'From the photo' : 'Your colour', meta: `#${hex} · ${meta}` };
    draw(true);
  }

  presets.forEach((button) => button.addEventListener('click', () => choosePreset(button)));

  // The picker beside the shelf, and Change on the tool's base row.
  document.querySelectorAll('[data-any-colour]').forEach((picker) => {
    picker.addEventListener('input', () => chooseColour(picker.value.slice(1).toUpperCase(), 'Picked'));
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
    // The photo is cropped to its card (object-fit: cover), so undo the crop: the scale that fills the box, and
    // how far object-position shifts the overflow.
    const scale = Math.max(bounds.width / photo.naturalWidth, bounds.height / photo.naturalHeight);
    const [positionX, positionY] = getComputedStyle(photo).objectPosition.split(' ').map((p) => parseFloat(p) / 100);
    const offsetX = (bounds.width - photo.naturalWidth * scale) * positionX;
    const offsetY = (bounds.height - photo.naturalHeight * scale) * positionY;
    const x = Math.round((event.clientX - bounds.left - offsetX) / scale);
    const y = Math.round((event.clientY - bounds.top - offsetY) / scale);
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
