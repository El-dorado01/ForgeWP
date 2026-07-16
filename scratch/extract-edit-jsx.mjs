import fs from 'fs';

const php = fs.readFileSync(
  'hotelchecker24/.forgewp/out/hotelchecker24/functions.php',
  'utf8',
);
const marker = "<<<'FORGEWP_BLOCKS'";
const start = php.indexOf(marker);
const after = php.indexOf('\n', start) + 1;
const end = php.indexOf('\nFORGEWP_BLOCKS', after);
const json = php.slice(after, end);
const blocks = JSON.parse(json);

console.log('count', blocks.length);
for (const b of blocks) {
  const dh = b.dualHostMeta ? Object.keys(b.dualHostMeta).length : 0;
  const edit = (b.customEditJsx || '').length;
  console.log(b.name, 'dualHostKeys=' + dh, 'editJsxLen=' + edit);
}

const names = [
  'forgewp/trust-strip',
  'forgewp/about-hero',
  'forgewp/hero-section',
  'forgewp/editorial-strip',
];
for (const name of names) {
  const b = blocks.find((x) => x.name === name);
  if (!b) {
    console.log('missing', name);
    continue;
  }
  const safe = name.replace('forgewp/', '');
  fs.writeFileSync(`scratch/${safe}-edit.js`, b.customEditJsx || '');
  console.log(
    'wrote',
    safe,
    'dualHost',
    JSON.stringify(b.dualHostMeta || null),
  );
}
