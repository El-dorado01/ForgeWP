import fs from 'node:fs';

const cssPath = 'C:\\Users\\hp\\Local Sites\\hotelchecker24\\app\\public\\wp-content\\themes\\hotelchecker24\\assets\\index-DULbTUXg.css';
console.log(`Reading local WP CSS: ${cssPath}...`);
if (!fs.existsSync(cssPath)) {
  console.error('Local CSS file does not exist!');
  process.exit(1);
}

const content = fs.readFileSync(cssPath, 'utf8');
console.log(`File size: ${content.length} characters`);

const checks = [
  'prose',
  'hc-rank',
  'a[href=""]',
  'a[href^="[option:"]',
  'display:none!important'
];

for (const check of checks) {
  const index = content.indexOf(check);
  console.log(`Contains "${check}": ${index !== -1} (index: ${index})`);
}
