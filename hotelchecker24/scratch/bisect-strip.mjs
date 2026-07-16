import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Pull private steps by re-reading and eval - easier: copy strip order with hooks
const srcFile = readFileSync(
  'packages/compiler/lib/blocks/source-sanitize.js',
  'utf8',
);

// Dynamic import of public API only — reimplement critical steps inline for bisect
const cellSrc = readFileSync('hotelchecker24/src/components/TrustStrip.tsx', 'utf8');
const start = cellSrc.indexOf('const cell');
const end = cellSrc.indexOf('return (', start);
const cell = cellSrc.slice(start, end);

function show(label, s) {
  const i = s.indexOf('[valueKey]');
  console.log(label.padEnd(20), i >= 0 ? JSON.stringify(s.slice(i, i + 35)) : 'NO valueKey');
}

// Import by evaluating stripped exports - use public stripTypeScriptSyntax stepwise via monkeypatch
import * as sanitize from '../../packages/compiler/lib/blocks/source-sanitize.js';

// Manually walk: we export only stripTypeScriptSyntax. Re-apply internal by duplicating
// the sequence from source after reading - simplest: binary comment-out test via copies.

let s = cell;
show('original', s);

// Step through by importing a patched version - just inline the known steps from the file content
// Use Function to extract stripAsCasts if needed - actually run regex steps from stripTypeScriptSyntax source:

s = cell.replace(/^import\s+type\s+[\s\S]*?;\s*/gm, '');
s = s.replace(/^export\s+type\s+[\s\S]*?;\s*/gm, '');
show('after type imports', s);

// Use the real strip via incremental - check Partial cast result on multiline
import { stripTypeScriptSyntax } from '../../packages/compiler/lib/blocks/source-sanitize.js';

// Simulate: only run until after cast by testing substrings around onChange
const onChangeFull = `onChange={(val) => setAttributes({ [valueKey]: val } as Partial<TrustStripProps>)}`;
show('line only', stripTypeScriptSyntax(onChangeFull));

// Add preceding JSX paren context
const withParen = `) => (
    <div>
            ${onChangeFull}
    </div>
  );`;
show('with paren jsx', stripTypeScriptSyntax(withParen));

// Add cell params with keyof
const withKeyof = `const cell = (
    value: string,
    valueKey: keyof TrustStripProps,
  ) => (
    <div>
            ${onChangeFull}
    </div>
  );`;
show('with keyof', stripTypeScriptSyntax(withKeyof));

// Full cell
show('full cell', stripTypeScriptSyntax(cell));
