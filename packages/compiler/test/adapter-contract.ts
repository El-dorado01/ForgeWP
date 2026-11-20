import type {
  ForgeWPFrameworkAdapter,
  ForgeWPFrameworkAdapterModule,
  ForgeWPStaticMarkup,
} from '../lib/index.js';

// The sole purpose of this file is compile-time validation of the adapter contract.
// If the contract changes, `pnpm exec tsc --noEmit -p tsconfig.test.json` will detect mismatches.

type RenderReturn = ReturnType<ForgeWPFrameworkAdapter['renderStaticMarkup']>;
type ResolvedRender = Awaited<RenderReturn>;

const _renderResult: ForgeWPStaticMarkup = {} as ResolvedRender;
const _adapter: ForgeWPFrameworkAdapter = {} as ForgeWPFrameworkAdapterModule;

const islands: string[] = _adapter.scanForHydrationIslands('.') ?? [];
const componentPath: string | null = _adapter.findComponentPath(
  '.',
  'example-island',
);
const inputs: Record<string, string> = _adapter.getHydrationRollupInputs('.');

// Force the render method return shape to match the contract.
const _renderPromise: Promise<ForgeWPStaticMarkup> = Promise.resolve(
  _adapter.renderStaticMarkup('.'),
);

void islands;
void componentPath;
void inputs;
void _renderPromise;
void _renderResult;

if (_adapter.packageAssets) {
  const packaged: Promise<import('../lib/index.js').ForgeWPPackagedAssets> = Promise.resolve(
    _adapter.packageAssets('.', './output', { islands: ['counter'] }),
  );
  void packaged;
}

// Build hooks are optional for render-only/testing adapters; export requires them.
if (_adapter.buildAssets && _adapter.readBuildAssets) {
  const build: Promise<import('../lib/index.js').ForgeWPBuildAssets> = Promise.resolve(
    _adapter.buildAssets('.', { packageManager: 'npm', verbose: true }),
  );
  const existing: Promise<import('../lib/index.js').ForgeWPBuildAssets> = Promise.resolve(
    _adapter.readBuildAssets('.'),
  );
  void build;
  void existing;
}

// Route records and layout metadata are additive on ForgeWPStaticMarkup.
const _routeMarkup: ForgeWPStaticMarkup = {
  appHtml: '<main>Home</main>',
  headerHtml: '<header>Nav</header>',
  footerHtml: '<footer>Foot</footer>',
  headHtml: '<title>Fixture</title>',
  layout: {
    lang: 'en',
    sharedHeaderDetected: true,
    sharedFooterDetected: true,
  },
  routes: [
    {
      path: '/',
      kind: 'home',
      title: 'Home',
      html: '<main>Home</main>',
      headHtml: '<title>Fixture</title>',
      layoutExtracted: true,
      assets: {
        stylesheets: ['_next/static/css/app.css'],
        clientScripts: ['_next/static/chunks/main.js'],
        strippedRuntime: { rscPayloadCount: 2, scriptCount: 1, preloadCount: 1 },
      },
      sourceFile: 'out/index.html',
    },
    {
      path: '/about',
      kind: 'page',
      slug: 'about',
      templateSlug: 'about',
      title: 'About',
      html: '<main id="details">About</main>',
      headHtml: '<title>About</title>',
      layoutExtracted: true,
    },
  ],
};
void _routeMarkup;
