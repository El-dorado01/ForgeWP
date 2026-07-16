import fs from 'fs';
import {
  parseJsxToAst,
  generateReactCreateElement,
} from '../packages/compiler/lib/blocks/editor-transpiler.js';
import {
  stripTypeScriptSyntax,
  rewriteAttrRefsSafely,
} from '../packages/compiler/lib/blocks/source-sanitize.js';

const src = fs.readFileSync(
  'hotelchecker24/src/components/ImpressumContent.tsx',
  'utf8',
);

const retIdx = src.lastIndexOf('return (');
const returnJsx = src.slice(retIdx + 'return ('.length);
const end = returnJsx.lastIndexOf(');\n}');
const jsx = returnJsx.slice(0, end).trim();

const attrs = [
  'companyHeading',
  'companyName',
  'companyLegalForm',
  'addressHeading',
  'addressLine1',
  'addressLine2',
  'addressCountry',
  'contactHeading',
  'contactEmail',
  'contactWebsiteLabel',
  'contactWebsiteUrl',
  'contactWebsiteDisplay',
  'registerHeading',
  'registerNumberLabel',
  'registerNumber',
  'vatLabel',
  'vatId',
  'courtLabel',
  'courtName',
  'legalHeading',
  'businessPurposeLabel',
  'businessPurpose',
  'authorityLabel',
  'authority',
  'trademarkLabel',
  'trademark',
  'paddingY',
];

const settings = {
  attributes: Object.fromEntries(attrs.map((k) => [k, { type: 'string' }])),
  importMap: {
    MapPin: 'lucide-react',
    Mail: 'lucide-react',
    Landmark: 'lucide-react',
    ShieldCheck: 'lucide-react',
  },
};

function tryCompile(label, cleaned) {
  try {
    const out = generateReactCreateElement(parseJsxToAst(cleaned), settings);
    const mangled = out.includes('") : ("') || out.includes('`)}`');
    console.log(label, 'mangled=', mangled, 'len=', out.length);
    if (mangled) {
      const mi = out.indexOf('") : ("');
      console.log(out.slice(mi - 80, mi + 100));
    }
    new Function(
      'createElement',
      'setAttributes',
      'editText',
      'sectionPaddingY',
      'paddingY',
      'wp',
      'MapPin',
      'Mail',
      'Landmark',
      'ShieldCheck',
      ...attrs,
      'return ' + out,
    );
    console.log(label, 'PARSE_OK');
  } catch (e) {
    console.log(label, 'FAIL', e.message);
  }
}

const stripped = stripTypeScriptSyntax(jsx);
tryCompile('strip only', stripped);
tryCompile('strip+rewrite', rewriteAttrRefsSafely(stripped, attrs));

// Isolate contact email ternary region
const emailStart = stripped.indexOf('{setAttributes ? (');
console.log('first ternary at', emailStart);
console.log(stripped.slice(emailStart, emailStart + 400));
