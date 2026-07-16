import { stripTypeScriptSyntax, rewriteAttrRefsSafely } from '../packages/compiler/lib/blocks/source-sanitize.js';

const cases = [
  [
    'map rename',
    `.map(({ icon: Icon, label, value }) => (`,
    `.map(({ icon: Icon, label, value }) => (`,
  ],
  [
    'string union default',
    `const editText = (value: string, key: keyof Props, className: string, tagName: 'span' | 'p' | 'h2' | 'h3' | 'div' = 'span') =>`,
    null, // just check no unexpected string
  ],
  [
    'simple types',
    `(value: string, n?: number) => value`,
    `(value, n) => value`,
  ],
];

for (const [name, input, expected] of cases) {
  const out = stripTypeScriptSyntax(input);
  console.log('---', name, '---');
  console.log(out);
  if (expected && out.replace(/\s+/g, ' ').trim() !== expected.replace(/\s+/g, ' ').trim()) {
    console.log('EXPECTED', expected);
  }
  try {
    // wrap to parse
    if (name === 'string union default') {
      const fn = out.replace(/^const editText = /, 'const editText = ');
      new Function(fn + ' {}');
      console.log('PARSE_OK');
    }
  } catch (e) {
    console.log('PARSE_FAIL', e.message);
  }
}

const rew = rewriteAttrRefsSafely(
  `const authority = useDual(authorityProp, 'authority');\nconst x = authority;`,
  ['authority'],
);
console.log('rewrite', rew);
if (rew.includes("'attributes.authority'")) {
  console.log('FAIL string rewritten');
} else if (!rew.includes('attributes.authority')) {
  console.log('FAIL bare not rewritten');
} else {
  console.log('rewrite OK');
}
