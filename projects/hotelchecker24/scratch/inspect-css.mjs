import fs from 'node:fs';

const cssPath = 'hotelchecker24/dist/assets/index-DULbTUXg.css';
const content = fs.readFileSync(cssPath, 'utf8');

const index = content.indexOf('a[href=""]');
if (index !== -1) {
  console.log('CSS rules starting from selector:');
  console.log(content.substring(index, index + 300));
} else {
  console.log('Selector not found!');
}
