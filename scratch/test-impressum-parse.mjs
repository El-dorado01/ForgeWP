import fs from 'fs';

const code = fs.readFileSync('scratch/impressum-content-edit.js', 'utf8');

try {
  new Function(code);
  console.log('OK as statement');
} catch (e) {
  console.log('stmt', e.message);
}

try {
  new Function('return (' + code + ')');
  console.log('OK as expr');
} catch (e) {
  console.log('expr', e.message);
}

// Find mangled ternary fragments
for (const [label, re] of [
  ['str ternary', /"\) : \("/g],
  ['tpl close', /`\)\}`/g],
  ['bare close', /\)\}`/g],
]) {
  let m;
  while ((m = re.exec(code))) {
    console.log(label, 'at', m.index);
    console.log(code.slice(Math.max(0, m.index - 60), m.index + 80));
    console.log('---');
  }
}

// Count createElement vs residual JSX
console.log('raw JSX count', (code.match(/<[A-Za-z]/g) || []).length);
console.log('file length', code.length);
