/**
 * Colour maps for the wave pictures, built from the site's palette.
 *
 * - Sequential (one hue, blue) encodes a magnitude such as |ψ|².
 * - Diverging (blue ↔ red around a neutral gray) encodes a signed field such
 *   as Re ψ or the magnetic field of light; gray means zero.
 *
 * Dark mode uses its own stops: near zero recedes into the dark surface.
 */

const SEQUENTIAL = {
  light: ['#fcfcfb', '#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'],
  dark: ['#1a1a19', '#0d366b', '#1c5cab', '#3987e5', '#86b6ef', '#cde2fb'],
};

const DIVERGING = {
  light: [
    '#0d366b',
    '#2a78d6',
    '#9ec5f4',
    '#f0efec',
    '#f3a9a8',
    '#e34948',
    '#7a1c1c',
  ],
  dark: [
    '#9ec5f4',
    '#3987e5',
    '#184f95',
    '#383835',
    '#9a3232',
    '#e66767',
    '#f6b8b8',
  ],
};

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function buildTable(stops) {
  const rgb = stops.map(hexToRgb);
  const table = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const position = (i / 255) * (rgb.length - 1);
    const low = Math.min(Math.floor(position), rgb.length - 2);
    const fraction = position - low;
    for (let c = 0; c < 3; c++) {
      table[i * 3 + c] = Math.round(
        rgb[low][c] + (rgb[low + 1][c] - rgb[low][c]) * fraction
      );
    }
  }
  return table;
}

const tables = new Map();

/**
 * @param {'sequential'|'diverging'} kind
 * @param {boolean} dark
 */
export function colorTable(kind, dark) {
  const key = `${kind}-${dark ? 'dark' : 'light'}`;
  if (!tables.has(key)) {
    const source = kind === 'sequential' ? SEQUENTIAL : DIVERGING;
    tables.set(key, buildTable(source[dark ? 'dark' : 'light']));
  }
  return tables.get(key);
}

/** CSS gradient matching a colour map, for legends. */
export function colorGradient(kind, dark) {
  const source = kind === 'sequential' ? SEQUENTIAL : DIVERGING;
  return `linear-gradient(90deg, ${source[dark ? 'dark' : 'light'].join(', ')})`;
}

/** Chart chrome read from CSS custom properties of the current theme. */
export function chartInk() {
  const style = window.getComputedStyle(document.documentElement);
  const read = (name) => style.getPropertyValue(name).trim();
  return {
    surface: read('--surface-1'),
    primary: read('--text-primary'),
    secondary: read('--text-secondary'),
    muted: read('--text-muted'),
    grid: read('--grid'),
    axis: read('--axis'),
    series: [read('--series-1'), read('--series-2'), read('--series-3')],
  };
}
