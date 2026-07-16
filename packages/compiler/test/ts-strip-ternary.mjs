import { stripTypeScriptSyntax } from '../lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../lib/blocks/editor-transpiler.js';

const spotlight = `const spotlightImage = spotlight ? (typeof spotlight.featuredImage === 'object' && spotlight.featuredImage !== null ? (spotlight.featuredImage as any).url : String(spotlight.featuredImage)) : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';`;

const out = stripTypeScriptSyntax(spotlight);
console.log(out);
if (!out.includes('String(spotlight.featuredImage)')) {
  console.error('❌ ternary branch stripped');
  process.exitCode = 1;
} else if (!out.includes('auto=format')) {
  console.error('❌ URL corrupted');
  process.exitCode = 1;
} else if (out.includes(' as ')) {
  console.error('❌ cast remains');
  process.exitCode = 1;
} else {
  console.log('✅ spotlightImage line OK');
}

const keyofLine = stripTypeScriptSyntax(
  `const cell = (\n    value: string,\n    valueKey: keyof TrustStripProps,\n  ) => (x);`,
);
console.log('keyof:', keyofLine);
if (keyofLine.includes('keyof') || keyofLine.includes('TrustStripProps')) {
  console.error('❌ keyof not fully stripped');
  process.exitCode = 1;
} else {
  console.log('✅ keyof stripped');
}

const castObj = stripTypeScriptSyntax(
  `onChange={(val) => setAttributes({ [valueKey]: val } as Partial<TrustStripProps>)}`,
);
console.log('castObj:', castObj);
if (!castObj.includes('[valueKey]: val')) {
  console.error('❌ object value stripped');
  process.exitCode = 1;
} else {
  console.log('✅ setAttributes object kept');
}

const preamble = `
const cell = (
    value,
    label,
    valueKey,
    labelKey,
  ) => (
    <div className='flex flex-col items-center gap-1'>
      <span>{value}</span>
    </div>
  );
`;
const settings = { attributes: {} };
const converted = transpileJsxInPreamble(preamble, settings);
console.log(converted);
if (converted.includes('<div')) {
  console.error('❌ JSX remains');
  process.exitCode = 1;
} else if (!converted.includes('createElement')) {
  console.error('❌ no createElement');
  process.exitCode = 1;
} else {
  console.log('✅ preamble JSX converted');
}
