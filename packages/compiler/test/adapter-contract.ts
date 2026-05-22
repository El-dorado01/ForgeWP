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
