import { readFileSync } from 'fs';

const code = readFileSync(
  'hotelchecker24/scratch/edit-jsx/forgewp_hero-section.js',
  'utf8',
);
const start = code.indexOf('{') + 1;
const ret = code.indexOf('return createElement');
const pre = code.slice(start, ret);
const lines = pre.split('\n');

console.log('Total preamble lines', lines.length);

// Find minimal suffix: grow until we get a non-structural error that persists when we close braces
function tryParse(body) {
  try {
    new Function(body);
    return null;
  } catch (e) {
    return e.message;
  }
}

// Scan for known-bad constructs
const badRes = [
  [/\bas\s+[A-Za-z]/, 'as cast'],
  [/:\s*[A-Z][A-Za-z0-9_]*\s*[=,)]/, 'type annotation'],
  [/\bkeyof\b/, 'keyof'],
  [/,\s*\)/, 'trailing comma in call? actually valid'],
];

for (const [re, label] of badRes) {
  if (re.test(pre)) {
    const m = pre.match(re);
    const idx = pre.search(re);
    console.log(
      'FOUND',
      label,
      'at',
      idx,
      JSON.stringify(pre.slice(Math.max(0, idx - 30), idx + 40)),
    );
  }
}

// Walk statements: try wrapping in try/catch and parse line groups
// Use acorn-free approach: check balanced and new Function with auto-close
function withClosed(body) {
  // Add closing braces/parens to balance
  let opens = 0;
  let openP = 0;
  let openB = 0;
  for (const c of body) {
    if (c === '{') opens++;
    else if (c === '}') opens--;
    else if (c === '(') openP++;
    else if (c === ')') openP--;
    else if (c === '[') openB++;
    else if (c === ']') openB--;
  }
  return body + ')'.repeat(Math.max(0, openP)) + ']'.repeat(Math.max(0, openB)) + '}'.repeat(Math.max(0, opens));
}

let lastOk = 0;
for (let i = 0; i < lines.length; i++) {
  const chunk = lines.slice(0, i + 1).join('\n');
  const err = tryParse(withClosed(chunk));
  if (!err) {
    lastOk = i + 1;
  } else if (!/Unexpected end|end of input|missing/i.test(err) || err.includes("Unexpected token ')'")) {
    // verify previous was ok with close
    const prev = lines.slice(0, i).join('\n');
    const prevErr = tryParse(withClosed(prev));
    if (!prevErr && err) {
      console.log(`\nBreak when adding line ${i + 1}: ${err}`);
      console.log('--- added line ---');
      console.log(lines[i]);
      console.log('--- context ---');
      console.log(
        lines
          .slice(Math.max(0, i - 8), i + 3)
          .map((l, j) => `${i - 8 + j + 1}| ${l}`)
          .join('\n'),
      );
      console.log('--- withClosed sample end ---');
      const closed = withClosed(chunk);
      console.log(closed.slice(-200));
      break;
    }
  }
}
console.log('lastOk lines', lastOk);
