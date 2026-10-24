import { createElement as h, useEffect, useState } from 'react';
import { AtomTab } from './tabs/AtomTab.js';
import { FractalTab } from './tabs/FractalTab.js';
import { HypothesisTab } from './tabs/HypothesisTab.js';
import { LightTab } from './tabs/LightTab.js';
import { MatterTab } from './tabs/MatterTab.js';
import { OrbitTab } from './tabs/OrbitTab.js';
import { ValidationTab } from './tabs/ValidationTab.js';

const repositoryUrl =
  import.meta.env.VITE_REPOSITORY_URL ??
  'https://github.com/konard/wavy-physics';

export const TABS = [
  { id: 'atom', label: 'Atom', component: AtomTab },
  { id: 'orbit', label: 'Electron packet', component: OrbitTab },
  { id: 'light', label: 'Light', component: LightTab },
  { id: 'matter', label: 'Matter waves', component: MatterTab },
  { id: 'fractal', label: 'Waves of waves', component: FractalTab },
  { id: 'validation', label: 'Validation', component: ValidationTab },
  { id: 'hypothesis', label: 'Hypothesis', component: HypothesisTab },
];

function tabFromHash() {
  const id = window.location.hash.replace('#', '');
  return TABS.some((tab) => tab.id === id) ? id : TABS[0].id;
}

function initialTheme() {
  const stored = window.localStorage?.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * The theme attribute is set before React re-renders, because canvases read
 * their colours from CSS variables while drawing (children draw first).
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  return theme;
}

function useTheme() {
  const [theme, setTheme] = useState(() => applyTheme(initialTheme()));
  const toggle = () => {
    const next = applyTheme(theme === 'dark' ? 'light' : 'dark');
    window.localStorage?.setItem('theme', next);
    setTheme(next);
  };
  return [theme, toggle];
}

function useActiveTab() {
  const [active, setActive] = useState(tabFromHash);
  useEffect(() => {
    const onHashChange = () => setActive(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return active;
}

function TabBar({ active }) {
  return h(
    'nav',
    { className: 'tab-bar', 'aria-label': 'Simulations' },
    TABS.map((tab) =>
      h(
        'a',
        {
          key: tab.id,
          href: `#${tab.id}`,
          className: tab.id === active ? 'tab tab-active' : 'tab',
          'aria-current': tab.id === active ? 'page' : undefined,
        },
        tab.label
      )
    )
  );
}

export function App() {
  const [theme, toggleTheme] = useTheme();
  const active = useActiveTab();
  const tab = TABS.find((entry) => entry.id === active);
  const dark = theme === 'dark';
  return h(
    'div',
    { className: 'app-shell' },
    h(
      'header',
      { className: 'app-header' },
      h(
        'div',
        { className: 'brand' },
        h('h1', { id: 'app-title' }, 'Wavy Physics'),
        h(
          'p',
          { className: 'tagline' },
          'Everything as waves: atoms, electrons and light simulated with wave equations only.'
        )
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'button theme-toggle',
          onClick: toggleTheme,
          'aria-label': `Switch to ${dark ? 'light' : 'dark'} theme`,
        },
        dark ? '☀ Light' : '☾ Dark'
      )
    ),
    h(TabBar, { active }),
    h(
      'main',
      { className: 'app-main', id: `panel-${tab.id}` },
      h(tab.component, { key: tab.id, dark })
    ),
    h(
      'footer',
      { className: 'app-footer' },
      h(
        'p',
        null,
        'Built with the ',
        h('a', { href: repositoryUrl }, 'wavy-physics'),
        ' JavaScript library (npm install wavy-physics). Atomic units, CODATA 2022 constants. Desktop and mobile builds: ',
        h('a', { href: `${repositoryUrl}/releases/latest` }, 'latest release'),
        '.'
      )
    )
  );
}
