import fs from 'fs';

const php = fs.readFileSync(
  'hotelchecker24/.forgewp/out/hotelchecker24/functions.php',
  'utf8',
);
const marker = "<<<'FORGEWP_BLOCKS'";
const start = php.indexOf(marker);
const after = php.indexOf('\n', start) + 1;
const end = php.indexOf('\nFORGEWP_BLOCKS', after);
const blocks = JSON.parse(php.slice(after, end));

for (const name of [
  'forgewp/contact-details',
  'forgewp/contact-form-section',
  'forgewp/contact-form',
  'forgewp/contact-hero',
]) {
  const b = blocks.find((x) => x.name === name);
  if (!b) {
    console.log('missing', name);
    continue;
  }
  const safe = name.replace('forgewp/', '');
  fs.writeFileSync(`scratch/${safe}-edit.js`, b.customEditJsx || '');
  console.log(name, 'len', (b.customEditJsx || '').length);
}
