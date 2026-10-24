/**
 * Small UI kit shared by the simulation tabs: animation loop, canvas
 * figures with hover read-outs, line plots, colour-mapped fields and form
 * controls.
 */

import {
  createElement as h,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { chartInk, colorGradient, colorTable } from './colors.js';

/** True when the visitor asked the system for reduced motion. */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Run `frame(elapsedSeconds)` on every animation frame while `playing`.
 * The callback is kept in a ref, so it can read fresh props without
 * restarting the loop.
 */
export function useAnimation(frame, playing) {
  const frameRef = useRef(frame);
  frameRef.current = frame;
  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    let handle = 0;
    let last = performance.now();
    const tick = (now) => {
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      frameRef.current(elapsed);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing]);
}

/** Play/pause state that starts paused for reduced-motion visitors. */
export function usePlaying() {
  return useState(() => !prefersReducedMotion());
}

/** Draw a scalar field through a colour map, stretched to the canvas. */
export function drawField(canvas, values, { nx, ny, kind, dark, range }) {
  if (!canvas) {
    return;
  }
  const context = canvas.getContext('2d');
  const table = colorTable(kind, dark);
  const scratch =
    canvas.scratch?.width === nx && canvas.scratch?.height === ny
      ? canvas.scratch
      : Object.assign(document.createElement('canvas'), {
          width: nx,
          height: ny,
        });
  canvas.scratch = scratch;
  const scratchContext = scratch.getContext('2d');
  const image = scratchContext.createImageData(nx, ny);
  const pixels = image.data;
  for (let i = 0; i < nx * ny; i++) {
    const normalized =
      kind === 'sequential'
        ? values[i] / range
        : 0.5 + (0.5 * values[i]) / range;
    const index = Math.max(0, Math.min(255, Math.round(normalized * 255)));
    pixels[i * 4] = table[index * 3];
    pixels[i * 4 + 1] = table[index * 3 + 1];
    pixels[i * 4 + 2] = table[index * 3 + 2];
    pixels[i * 4 + 3] = 255;
  }
  scratchContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

/** Largest absolute value of an array (never zero, to avoid 0/0). */
export function peak(values) {
  let largest = 0;
  for (let i = 0; i < values.length; i++) {
    const value = Math.abs(values[i]);
    if (value > largest) {
      largest = value;
    }
  }
  return largest || 1;
}

function niceTicks(min, max, count = 4) {
  const span = max - min;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) * magnitude;
  const ticks = [];
  for (
    let v = Math.ceil(min / step) * step;
    v <= max + step * 1e-9;
    v += step
  ) {
    ticks.push(Number(v.toPrecision(10)));
  }
  return ticks;
}

/**
 * Line plot on a canvas. Thin 2px lines, hairline grid, muted axis labels.
 * @param {HTMLCanvasElement} canvas
 * @param {{series: Array<{x: ArrayLike<number>, y: ArrayLike<number>,
 *   color?: string, dashed?: boolean, fill?: boolean}>,
 *   xRange: [number, number], yRange: [number, number], xLabel?: string}} plot
 */
export function drawLines(canvas, { series, xRange, yRange, xLabel = '' }) {
  if (!canvas) {
    return;
  }
  const context = canvas.getContext('2d');
  const ink = chartInk();
  const { width, height } = canvas;
  const pad = { left: 44, right: 10, top: 10, bottom: xLabel ? 34 : 22 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const toX = (x) =>
    pad.left + ((x - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
  const toY = (y) =>
    pad.top + (1 - (y - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;
  context.fillStyle = ink.surface;
  context.fillRect(0, 0, width, height);
  context.font = '11px system-ui, sans-serif';
  context.lineWidth = 1;
  context.fillStyle = ink.muted;
  context.strokeStyle = ink.grid;
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const tick of niceTicks(yRange[0], yRange[1])) {
    context.beginPath();
    context.moveTo(pad.left, toY(tick));
    context.lineTo(width - pad.right, toY(tick));
    context.stroke();
    context.fillText(String(tick), pad.left - 6, toY(tick));
  }
  context.textAlign = 'center';
  context.textBaseline = 'top';
  for (const tick of niceTicks(xRange[0], xRange[1], 5)) {
    context.fillText(String(tick), toX(tick), height - pad.bottom + 6);
  }
  if (xLabel) {
    context.fillStyle = ink.secondary;
    context.fillText(xLabel, pad.left + plotWidth / 2, height - 14);
  }
  context.strokeStyle = ink.axis;
  context.beginPath();
  context.moveTo(pad.left, toY(Math.max(yRange[0], Math.min(0, yRange[1]))));
  context.lineTo(
    width - pad.right,
    toY(Math.max(yRange[0], Math.min(0, yRange[1])))
  );
  context.stroke();
  context.save();
  context.beginPath();
  context.rect(pad.left, pad.top, plotWidth, plotHeight);
  context.clip();
  series.forEach((line, index) => {
    const color = line.color ?? ink.series[index % ink.series.length];
    context.beginPath();
    for (let i = 0; i < line.y.length; i++) {
      const px = toX(line.x[i]);
      const py = toY(line.y[i]);
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.setLineDash(line.dashed ? [6, 4] : []);
    context.strokeStyle = color;
    context.stroke();
    if (line.fill) {
      context.lineTo(toX(line.x[line.x.length - 1]), toY(0));
      context.lineTo(toX(line.x[0]), toY(0));
      context.closePath();
      context.globalAlpha = 0.16;
      context.fillStyle = color;
      context.fill();
      context.globalAlpha = 1;
    }
  });
  context.restore();
  context.setLineDash([]);
}

/** Map a pointer event to fractions (0..1) of the canvas box. */
function pointerFractions(event) {
  const box = event.currentTarget.getBoundingClientRect();
  return [
    (event.clientX - box.left) / box.width,
    (event.clientY - box.top) / box.height,
  ];
}

/**
 * A canvas with a caption and a hover read-out. `readout(fx, fy)` returns
 * the text for the pointer position (fractions of the box), or null.
 */
export function Figure({
  canvasRef,
  width,
  height,
  label,
  caption,
  readout,
  square = false,
  children,
}) {
  const [tip, setTip] = useState(null);
  const onMove = useCallback(
    (event) => {
      if (!readout) {
        return;
      }
      const [fx, fy] = pointerFractions(event);
      const text = readout(fx, fy);
      setTip(text ? { text, fx, fy } : null);
    },
    [readout]
  );
  return h(
    'figure',
    { className: `figure${square ? ' figure-square' : ''}` },
    h(
      'div',
      { className: 'figure-canvas' },
      h('canvas', {
        ref: canvasRef,
        width,
        height,
        role: 'img',
        'aria-label': label,
        onPointerMove: onMove,
        onPointerDown: onMove,
        onPointerLeave: () => setTip(null),
      }),
      tip &&
        h(
          'div',
          {
            className: 'tooltip',
            style: {
              left: `${Math.min(tip.fx, 0.7) * 100}%`,
              top: `${Math.min(tip.fy, 0.85) * 100}%`,
            },
          },
          tip.text
        )
    ),
    (caption || children) && h('figcaption', null, caption, children)
  );
}

/** Legend row for a colour map. */
export function ColorLegend({ kind, dark, low, high, middle }) {
  return h(
    'div',
    { className: 'color-legend' },
    h('span', null, low),
    h(
      'span',
      { className: 'color-legend-scale' },
      h('span', {
        className: 'color-legend-bar',
        style: { background: colorGradient(kind, dark) },
      }),
      middle && h('span', { className: 'color-legend-middle' }, middle)
    ),
    h('span', null, high)
  );
}

/** Legend for line series (identity never relies on colour alone). */
export function SeriesLegend({ items }) {
  const ink = chartInk();
  return h(
    'ul',
    { className: 'series-legend' },
    items.map((item, index) =>
      h(
        'li',
        { key: item.label },
        h('span', {
          className: `swatch${item.dashed ? ' swatch-dashed' : ''}`,
          style: {
            borderColor: item.color ?? ink.series[index % ink.series.length],
          },
        }),
        item.label
      )
    )
  );
}

export function Slider({ id, label, value, min, max, step, onChange, format }) {
  return h(
    'label',
    { className: 'control', htmlFor: id },
    h(
      'span',
      { className: 'control-label' },
      label,
      h('output', { htmlFor: id }, format ? format(value) : String(value))
    ),
    h('input', {
      id,
      type: 'range',
      min,
      max,
      step,
      value,
      onChange: (event) => onChange(Number(event.target.value)),
    })
  );
}

export function Select({ id, label, value, options, onChange }) {
  return h(
    'label',
    { className: 'control', htmlFor: id },
    h('span', { className: 'control-label' }, label),
    h(
      'select',
      { id, value, onChange: (event) => onChange(event.target.value) },
      options.map((option) =>
        h('option', { key: option.value, value: option.value }, option.label)
      )
    )
  );
}

export function PlayControls({ playing, setPlaying, onReset }) {
  return h(
    'div',
    { className: 'play-controls' },
    h(
      'button',
      {
        type: 'button',
        className: 'button button-primary',
        onClick: () => setPlaying(!playing),
        'aria-pressed': playing,
      },
      playing ? 'Pause' : 'Play'
    ),
    onReset &&
      h(
        'button',
        { type: 'button', className: 'button', onClick: onReset },
        'Restart'
      )
  );
}

/** A labelled number: the honest summary of what the simulation computed. */
export function Stat({ label, value, detail }) {
  return h(
    'div',
    { className: 'stat' },
    h('span', { className: 'stat-label' }, label),
    h('strong', { className: 'stat-value' }, value),
    detail && h('span', { className: 'stat-detail' }, detail)
  );
}

export function StatRow({ children }) {
  return h('div', { className: 'stat-row', 'aria-live': 'polite' }, children);
}

/** Two-column tab layout: figures on the left, controls/explanation right. */
export function TabLayout({ title, intro, figures, controls, notes }) {
  return h(
    'div',
    { className: 'tab-layout' },
    h(
      'div',
      { className: 'tab-main' },
      h('h2', null, title),
      h('p', { className: 'lede' }, intro),
      figures
    ),
    h(
      'aside',
      { className: 'tab-side' },
      h('div', { className: 'controls' }, controls),
      notes && h('div', { className: 'notes' }, notes)
    )
  );
}

/** Format a number with a fixed count of significant digits. */
export function format(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (value !== 0 && (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e6)) {
    return value.toExponential(digits - 1);
  }
  return Number(value.toPrecision(digits)).toString();
}
