/**
 * Per-export interactivity: a file that mixes static layout helpers with a
 * genuine island must not mark every import as client-interactive.
 *
 * Confirmed live failure: reveal.tsx exports Reveal (useReducedMotion only)
 * and CountUp (useState/useEffect). File-level scanning wrapped <Reveal>
 * as an island; the hydrator then remounted CountUp / empty Reveal and
 * painted "NaN" over section headers.
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';
import {
  isComponentInteractive,
  isExportInteractive,
  getInteractiveExportNames,
} from '../../lib/hydration/is-interactive.js';
import { transformThemeFile } from '../../lib/hydration/transform.js';
import { resolveIslandComponent } from '../../lib/hydration/resolve-island-component.js';
import { resolveIslandChunk } from '../../lib/hydration/resolve-island-chunk.js';
import { scanForHydrationIslands } from '../../lib/hydration/islands-scanner.js';
import { buildHydrationEnqueuerPhp } from '../../lib/functions/hydration-enqueuer.js';
import { computeIslandSplit } from '../../lib/hydration/island-split.js';
import { scanAppProviders, fileImportsProvider } from '../../lib/hydration/scan-app-providers.js';
import { shouldSkipEnterInitial, visibleFirstPaintProps } from '../../lib/hydration/enter-hidden-initial.js';

const themeFixtures = [];

function writeTheme(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'forgewp-hydration-'));
  themeFixtures.push(root);
  for (const [rel, source] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, source, 'utf8');
  }
  return root;
}

afterEach(() => {
  while (themeFixtures.length) {
    const dir = themeFixtures.pop();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

const REVEAL_SOURCE = `
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function Reveal({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial="hidden" animate="visible">{children}</motion.div>;
}

export function Stagger({ children, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return <motion.div className={className}>{children}</motion.div>;
}

export function CountUp({ to, suffix = '' }) {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState(reduce ? to : 0);
  React.useEffect(() => {
    setValue(to);
  }, [to]);
  return <span>{value}{suffix}</span>;
}

export { motion, useReducedMotion };
`;

const MAGNETIC_SOURCE = `
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function RollText({ children }) {
  const reduce = useReducedMotion();
  if (reduce) return <span>{children}</span>;
  return <span className="roll">{children}</span>;
}

export function Magnetic({ children, strength = 0.2 }) {
  const reduce = useReducedMotion();
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      animate={pos}
      onMouseMove={() => setPos({ x: strength, y: 0 })}
    >
      {children}
    </motion.div>
  );
}
`;

const HEADER_SOURCE = `
import * as React from 'react';

export function Header() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setOpen(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className="sticky top-0 z-40">
      <button onClick={() => setOpen((v) => !v)}>Menu</button>
    </header>
  );
}
`;

describe('isExportInteractive — mixed helper + island files', () => {
  it('does not treat Reveal / Stagger layout helpers as islands just because CountUp lives in the same file', () => {
    const root = writeTheme({ 'reveal.tsx': REVEAL_SOURCE });
    const file = path.join(root, 'reveal.tsx');

    expect(isComponentInteractive(file)).toBe(true);
    expect(isExportInteractive(file, 'Reveal')).toBe(false);
    expect(isExportInteractive(file, 'Stagger')).toBe(false);
    expect(isExportInteractive(file, 'CountUp')).toBe(true);
    expect(getInteractiveExportNames(file)).toEqual(['CountUp']);
  });

  it('treats Magnetic as interactive and RollText as static in the same module', () => {
    const root = writeTheme({ 'micro.tsx': MAGNETIC_SOURCE });
    const file = path.join(root, 'micro.tsx');

    expect(isExportInteractive(file, 'RollText')).toBe(false);
    expect(isExportInteractive(file, 'Magnetic')).toBe(true);
    expect(getInteractiveExportNames(file)).toEqual(['Magnetic']);
  });

  it('never treats *Provider context wrappers as islands', () => {
    const root = writeTheme({
      'cart-context.tsx': `
import * as React from 'react';
export function CartProvider({ children }) {
  const [items, setItems] = React.useState([]);
  return <div data-cart>{children}</div>;
}
`,
    });
    const file = path.join(root, 'cart-context.tsx');

    expect(isExportInteractive(file, 'CartProvider')).toBe(false);
    expect(getInteractiveExportNames(file)).toEqual([]);
  });

  it('marks Header (useState + window) as an interactive export', () => {
    const root = writeTheme({ 'header.tsx': HEADER_SOURCE });
    const file = path.join(root, 'header.tsx');

    expect(isExportInteractive(file, 'Header')).toBe(true);
    expect(getInteractiveExportNames(file)).toEqual(['Header']);
  });
});

describe('transformThemeFile — preserves layout helpers as clean SSR containers', () => {
  it('leaves <Reveal> with JSX children unwrapped to maintain 100% CSS Grid/Flexbox layout integrity', () => {
    const root = writeTheme({
      'src/components/reveal.tsx': REVEAL_SOURCE,
      'src/app/page.tsx': `
import { Reveal } from '../components/reveal';
export default function Page() {
  return (
    <Reveal className="mb-6">
      <h2>Popular Categories</h2>
    </Reveal>
  );
}
`,
    });

    const pagePath = path.join(root, 'src/app/page.tsx');
    const code = readFileSync(pagePath, 'utf8');
    const transformed = transformThemeFile(code, pagePath, root);

    expect(transformed).not.toContain('<Hydrate');
    expect(transformed).toContain('<Reveal');
  });

  it('wraps interactive <Magnetic> even when it receives children (hydrator restores SSR HTML)', () => {
    const root = writeTheme({
      'src/components/micro.tsx': MAGNETIC_SOURCE,
      'src/components/button.tsx': `
import { Magnetic } from './micro';
export function Button({ children }) {
  return <Magnetic strength={0.22}>{children}</Magnetic>;
}
`,
    });

    const file = path.join(root, 'src/components/button.tsx');
    const transformed = transformThemeFile(readFileSync(file, 'utf8'), file, root);

    expect(transformed).toContain('<Hydrate id="magnetic"');
    expect(transformed).toContain('<Magnetic');
  });

  it('wraps a self-closing interactive leaf like <Header />', () => {
    const root = writeTheme({
      'src/components/header.tsx': HEADER_SOURCE,
      'src/components/shell.tsx': `
import { Header } from './header';
export function Shell({ children }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
`,
    });

    const file = path.join(root, 'src/components/shell.tsx');
    const transformed = transformThemeFile(readFileSync(file, 'utf8'), file, root);

    expect(transformed).toContain('<Hydrate id="header"');
    expect(transformed).toContain('<Header />');
  });
});

describe('resolveIslandComponent — named export matching', () => {
  it('resolves the named export that matches the island id', () => {
    const Header = () => null;
    const Other = () => null;
    expect(resolveIslandComponent({ Header, Other }, 'header')).toBe(Header);
  });

  it('does not fall back to Object.values()[0] when several functions are exported', () => {
    const Alpha = () => null;
    const Beta = () => null;
    expect(resolveIslandComponent({ Alpha, Beta }, 'gamma')).toBeUndefined();
  });

  it('uses default when it is the only matching function and the name is absent', () => {
    const Component = () => null;
    expect(resolveIslandComponent({ default: Component }, 'anything')).toBe(Component);
  });

  it('uses the unique function export when there is exactly one', () => {
    const Single = () => null;
    expect(resolveIslandComponent({ Single }, 'different-name')).toBe(Single);
  });
});

describe('comfortable-decor theme — mixed motion helpers stay static', () => {
  const themeRoot = fileURLToPath(new URL('../../../../comfortable-decor/', import.meta.url));
  const revealFile = path.join(themeRoot, 'src/components/motion/reveal.tsx');
  const microFile = path.join(themeRoot, 'src/components/motion/micro.tsx');

  it('Reveal / Stagger / RollText are static; CountUp / Magnetic are islands', () => {
    if (!existsSync(revealFile) || !existsSync(microFile)) return;

    expect(isExportInteractive(revealFile, 'Reveal')).toBe(false);
    expect(isExportInteractive(revealFile, 'Stagger')).toBe(false);
    expect(isExportInteractive(revealFile, 'StaggerItem')).toBe(false);
    expect(isExportInteractive(revealFile, 'HeroMotion')).toBe(false);
    expect(isExportInteractive(revealFile, 'CountUp')).toBe(true);

    expect(isExportInteractive(microFile, 'RollText')).toBe(false);
    expect(isExportInteractive(microFile, 'Magnetic')).toBe(true);

    const revealIslands = getInteractiveExportNames(revealFile);
    expect(revealIslands).toContain('CountUp');
    expect(revealIslands).not.toContain('Reveal');
    expect(revealIslands).not.toContain('Stagger');
  });

  it('Smart Discovery does not register a "reveal" island from <Reveal> usage', () => {
    if (!existsSync(themeRoot)) return;
    const islands = scanForHydrationIslands(themeRoot);
    expect(islands).not.toContain('reveal');
    expect(islands).not.toContain('stagger');
    expect(islands).not.toContain('roll-text');
    expect(islands).not.toContain('button-label');
    expect(islands).not.toContain('cart-provider');
    expect(islands).not.toContain('wishlist-provider');
  });
});

describe('resolveIslandChunk — hyphenated island ids vs Vite hashes', () => {
  const manifest = {
    'src/components/motion/reveal.tsx': {
      file: 'assets/count-up-Dtfp7iNm.js',
      name: 'count-up',
      src: 'src/components/motion/reveal.tsx',
    },
    'src/components/layout/header.tsx': {
      file: 'assets/header-V77EITx8.js',
      name: 'header',
      src: 'src/components/layout/header.tsx',
    },
    'src/components/product/product-hotspot.tsx': {
      file: 'assets/product-hotspot-DVApi_vs.js',
      name: 'product-hotspot',
      src: 'src/components/product/product-hotspot.tsx',
    },
  };

  it('resolves CountUp compiled from reveal.tsx via the Vite input name', () => {
    expect(resolveIslandChunk(manifest, 'count-up')).toBe('assets/count-up-Dtfp7iNm.js');
  });

  it('still resolves same-named files (header, product-hotspot)', () => {
    expect(resolveIslandChunk(manifest, 'header')).toBe('assets/header-V77EITx8.js');
    expect(resolveIslandChunk(manifest, 'product-hotspot')).toBe('assets/product-hotspot-DVApi_vs.js');
  });

  it('does not confuse a hyphenated island name with the content-hash suffix', () => {
    const nameless = {
      'src/components/motion/reveal.tsx': {
        file: 'assets/count-up-Dtfp7iNm.js',
        src: 'src/components/motion/reveal.tsx',
      },
    };
    expect(resolveIslandChunk(nameless, 'count-up')).toBe('assets/count-up-Dtfp7iNm.js');
  });
});

describe('enter-hidden first paint — variant names and objects', () => {
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  };

  it('skips initial="hidden" when variants.hidden is enter-hidden', () => {
    expect(shouldSkipEnterInitial({ initial: 'hidden', variants: fadeUp, whileInView: 'visible' })).toBe(true);
    const next = visibleFirstPaintProps({ initial: 'hidden', variants: fadeUp, whileInView: 'visible' });
    expect(next.initial).toBe(false);
    expect(next.animate).toBe('visible');
  });

  it('skips object initials like { opacity: 0 }', () => {
    expect(shouldSkipEnterInitial({ initial: { opacity: 0, scale: 1.04 } })).toBe(true);
  });

  it('does not treat a data initial as an animation', () => {
    expect(shouldSkipEnterInitial({ initial: { title: 'Hello' } })).toBe(false);
    expect(shouldSkipEnterInitial({ initial: false })).toBe(false);
  });

  it('skips stagger parents with initial="hidden" even when variants.hidden is empty', () => {
    const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
    expect(shouldSkipEnterInitial({ initial: 'hidden', animate: 'visible', variants: stagger })).toBe(true);
  });

  it('skips children that only pass enter-hidden variants (inherited initial)', () => {
    expect(shouldSkipEnterInitial({ variants: fadeUp })).toBe(true);
    expect(visibleFirstPaintProps({ variants: fadeUp }).initial).toBe(false);
    expect(visibleFirstPaintProps({ variants: fadeUp }).animate).toBe('visible');
  });
});

describe('scanAppProviders — layout provider tree, not islands', () => {
  it('returns theme-local *Provider tags in nest order and ignores package providers', () => {
    const root = writeTheme({
      'src/context/cart-context.tsx': `
import * as React from 'react';
export function CartProvider({ children }) {
  const [items, setItems] = React.useState([]);
  return <div>{children}</div>;
}
`,
      'src/context/wishlist-context.tsx': `
import * as React from 'react';
export function WishlistProvider({ children }) {
  const [ids, setIds] = React.useState([]);
  return <div>{children}</div>;
}
`,
      'src/app/layout.tsx': `
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from '@/context/cart-context';
import { WishlistProvider } from '@/context/wishlist-context';
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </HelmetProvider>
  );
}
`,
    });

    const providers = scanAppProviders(root);
    expect(providers.map((p) => p.exportName)).toEqual(['CartProvider', 'WishlistProvider']);
    expect(providers[0].kebab).toBe('cart-provider');
    expect(providers[1].kebab).toBe('wishlist-provider');
  });

  it('fileImportsProvider is true only for files that import a layout provider module', () => {
    const root = writeTheme({
      'src/context/wishlist-context.tsx': `
export function WishlistProvider({ children }) { return children; }
export function useWishlist() { return { toggle() {} }; }
`,
      'src/components/product-card.tsx': `
import { useWishlist } from '@/context/wishlist-context';
export function ProductCard() {
  const { toggle } = useWishlist();
  return <button onClick={() => toggle(1)}>heart</button>;
}
`,
      'src/components/reviews.tsx': `
export function ReviewsMarquee() {
  return <section>quote</section>;
}
`,
      'src/app/layout.tsx': `
import { WishlistProvider } from '@/context/wishlist-context';
export default function RootLayout({ children }) {
  return <WishlistProvider>{children}</WishlistProvider>;
}
`,
    });
    const providers = scanAppProviders(root);
    expect(fileImportsProvider(path.join(root, 'src/components/product-card.tsx'), providers)).toBe(true);
    expect(fileImportsProvider(path.join(root, 'src/components/reviews.tsx'), providers)).toBe(false);
  });
});

describe('island-split — do not tear layout or drop module data', () => {
  it('refuses to extract non-sibling nodes (accordion tabs + photo column)', () => {
    const source = `
import { useState } from 'react';
import { motion } from 'framer-motion';

const items = [{ id: 'oak', name: 'Oak', image: '/oak.jpg' }];

export function MaterialityAccordion() {
  const [activeId, setActiveId] = useState('oak');
  const active = items.find((i) => i.id === activeId) || items[0];
  return (
    <section>
      <div className="left">
        <div onMouseEnter={() => setActiveId('oak')} onClick={() => setActiveId('oak')}>
          {active.name}
        </div>
      </div>
      <div className="right">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <img src={active.image} alt={active.name} />
        </motion.div>
      </div>
    </section>
  );
}
`;
    const result = computeIslandSplit('MaterialityAccordion.tsx', source);
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not siblings|large majority|motion animations|cohesive island/i);
  });

  it('merges hook-sharing islands and then refuses a non-sibling layout split', () => {
    const source = `
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [{ id: 1, quote: 'Hello', author: 'A' }];

export function ReviewsMarquee() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const current = testimonials[currentIndex];
  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };
  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };
  return (
    <section>
      <div className="quote">
        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {current.quote}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="controls">
        <button type="button" onClick={handlePrev}>prev</button>
        <button type="button" onClick={handleNext}>next</button>
      </div>
    </section>
  );
}
`;
    const result = computeIslandSplit('ReviewsMarquee.tsx', source);
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/not siblings|large majority|shared state|motion animations|cohesive island/i);
  });
});

describe('hydration-enqueuer — hydrator script is cache-busted with filemtime', () => {
  it('enqueues forgewp-hydrator.js with filemtime, not the static theme version', () => {
    const php = buildHydrationEnqueuerPhp(
      { textDomain: 'comfortable-decor', forms: {} },
      { cssFile: 'assets/style.css' },
      'index.js',
      new Set(),
      [],
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'usernameAndEmail',
      "\n                'providers' => array('cart-provider', 'wishlist-provider'),"
    );

    expect(php).toContain("$hydrator_path = get_template_directory() . '/assets/forgewp-hydrator.js'");
    expect(php).toMatch(/file_exists\(\$hydrator_path\)\s*\?\s*filemtime\(\$hydrator_path\)/);
    expect(php).toContain("'providers' => array('cart-provider', 'wishlist-provider')");
    expect(php).toContain("'comfortable-decor-react-runtime'");
    expect(php).toContain("'comfortable-decor-hydrator'");
  });
});
