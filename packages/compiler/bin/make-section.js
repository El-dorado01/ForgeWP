#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

const args = process.argv.slice(2);

function getOption(name, fallback = '') {
  const exactIndex = args.indexOf(`--${name}`);
  if (exactIndex !== -1 && args[exactIndex + 1]) return args[exactIndex + 1];
  const equal = args.find((arg) => arg.startsWith(`--${name}=`));
  return equal ? equal.slice(name.length + 3) : fallback;
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPascalCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toSnakeCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function parseFields() {
  const raw = getOption('fields');
  if (!raw) {
    return [
      { name: 'title', type: 'text' },
      { name: 'description', type: 'richText' },
    ];
  }

  const validTypes = new Set([
    'text',
    'richText',
    'image',
    'boolean',
    'repeater',
    'color',
    'url',
    'select',
    'number',
    'icon',
  ]);

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, requestedType = 'text'] = entry
        .split(':')
        .map((part) => part.trim());
      return {
        name,
        type: validTypes.has(requestedType) ? requestedType : 'text',
      };
    })
    .filter((field) => /^[a-zA-Z_$][\w$]*$/.test(field.name));
}

const rawName = getOption('name') || args.find((arg) => !arg.startsWith('-'));
if (!rawName) {
  console.error(pc.red('\n❌ Error: Please specify a section name.'));
  console.log(
    pc.cyan(
      '   Example: pnpm forgewp make:section HeroSection --page=front-page --block\n',
    ),
  );
  process.exit(1);
}

const projectRoot = process.cwd();
if (!existsSync(path.join(projectRoot, 'src'))) {
  console.error(
    pc.red('\n❌ Error: "src" folder not found. Are you in your theme root?\n'),
  );
  process.exit(1);
}

const componentName = toPascalCase(rawName);
const slug =
  toKebabCase(componentName.replace(/Section$/, '')) ||
  toKebabCase(componentName);
const pageSlug = toKebabCase(getOption('page', 'front-page'));
const fields = parseFields();
const withBlock = args.includes('--block') || args.includes('--block=true');

if (fields.length === 0) {
  console.error(pc.red('\n❌ Error: No valid fields were provided.\n'));
  process.exit(1);
}

const schemaDir = path.join(projectRoot, 'cms', 'editables', 'sections');
const componentDir = path.join(projectRoot, 'src', 'components');
const schemaFile = path.join(schemaDir, `${slug}.ts`);
const pageFile = path.join(projectRoot, 'cms', 'editables', `${pageSlug}.ts`);
const componentFile = path.join(componentDir, `${componentName}.tsx`);
const pageExists = existsSync(pageFile);

for (const target of [schemaFile, componentFile]) {
  if (existsSync(target)) {
    console.error(
      pc.red(
        `\n❌ Error: File already exists: ${path.relative(projectRoot, target)}\n`,
      ),
    );
    process.exit(1);
  }
}

mkdirSync(schemaDir, { recursive: true });
mkdirSync(componentDir, { recursive: true });

const imports = Array.from(
  new Set([
    'defineEditable',
    'getEditableDefaults',
    ...fields.map((field) => field.type),
  ]),
).join(',\n  ');
const fieldDefinitions = fields
  .map(({ name, type }) => {
    const defaultValue =
      type === 'boolean'
        ? 'false'
        : type === 'number'
          ? '0'
          : type === 'image'
            ? "''"
            : type === 'repeater'
              ? '[]'
              : "'Edit me'";
    return `  ${name}: ${type}({\n    label: '${name.replace(/[_-]+/g, ' ')}',\n    default: ${defaultValue},\n  }),`;
  })
  .join('\n');

const pageFields = fields
  .map(({ name }) => `  ${name}: '${slug}_${toSnakeCase(name)}',`)
  .join('\n');
const renameFields = fields
  .map(({ name }) => `      ${name}: '${toSnakeCase(name)}',`)
  .join('\n');

const pageSchemaSource = `/**\n * ${pageSlug} — page editable contract composed from sections.\n */\nimport { buildPageEditable, getEditableDefaults } from '@forgewp/react';\nimport { editable as ${slug}Editable } from './sections/${slug}';\n\nexport const pageEditableSections = [\n  {\n    section: '${slug}',\n    prefix: '${slug}_',\n    rename: {\n${renameFields}\n    },\n  },\n];\n\nexport const editable = buildPageEditable([\n  {\n    schema: ${slug}Editable,\n    prefix: '${slug}_',\n    rename: {\n${renameFields}\n    },\n  },\n]);\n\nexport const defaults = getEditableDefaults(editable);\n`;

const schemaSource = `/**\n * ${componentName} — canonical section content contract.\n *\n * Compose this schema into cms/editables/${pageSlug}.ts for baked-page ACF\n * fields, then reuse it from the section component and generated block.\n */\nimport {\n  ${imports},\n} from '@forgewp/react';\n\nexport const editable = defineEditable({\n${fieldDefinitions}\n});\n\nexport const defaults = getEditableDefaults(editable);\n`;

const fieldTypes = {
  text: 'string',
  richText: 'string',
  image: 'string',
  color: 'string',
  url: 'string',
  select: 'string',
  icon: 'string',
  boolean: 'boolean',
  number: 'number',
  repeater: 'unknown[]',
};
const props = fields
  .map(({ name, type }) => `  ${name}?: ${fieldTypes[type]};`)
  .join('\n');
const resolvedValues = fields
  .map(
    ({ name }) =>
      `  const ${name}Meta = useWpMeta('${slug}_${toSnakeCase(name)}', defaults.${slug}_${toSnakeCase(name)});\n  const ${name} = ${name}Prop ?? ${name}Meta;`,
  )
  .join('\n');
const renderedFields = fields
  .map(({ name, type }) => {
    if (type !== 'text' && type !== 'richText') {
      return `      <div data-field='${name}'>{String(${name})}</div>`;
    }
    const tagName = type === 'richText' ? 'p' : 'h2';
    return `      {setAttributes ? (\n        <WpEditable\n          tagName='${tagName}'\n          value={${name}}\n          onChange={(value) => setAttributes({ ${name}: value })}\n        />\n      ) : (\n        <${tagName}>{${name}}</${tagName}>\n      )}`;
  })
  .join('\n');
const propDestructuring = fields
  .map(({ name }) => `  ${name}: ${name}Prop,`)
  .join('\n');
const blockAnnotation = withBlock
  ? `/**\n * @forgewp-block\n * title: ${componentName.replace(/([A-Z])/g, ' $1').trim()}\n * category: theme\n * description: Editable ${slug} section.\n */\n`
  : '';

const componentSource = `import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';\nimport { editable as pageEditable, defaults } from '../../cms/editables/${pageSlug}';\n\nexport const editable = pickEditable(pageEditable, {\n${pageFields}\n});\n\nexport interface ${componentName}Props {\n${props}\n  setAttributes?: (attributes: Partial<${componentName}Props>) => void;\n}\n\n${blockAnnotation}export function ${componentName}({\n${propDestructuring}\n  setAttributes,\n}: ${componentName}Props) {\n${resolvedValues}\n\n  return (\n    <section>\n${renderedFields}\n    </section>\n  );\n}\n\nexport default ${componentName};\n`;

writeFileSync(schemaFile, schemaSource, 'utf8');
if (!existsSync(pageFile)) {
  writeFileSync(pageFile, pageSchemaSource, 'utf8');
}
writeFileSync(componentFile, componentSource, 'utf8');

console.log(pc.green(`\n⚡ Section "${componentName}" created.`));
console.log(`   Schema:    ${pc.cyan(path.relative(projectRoot, schemaFile))}`);
console.log(`   Page:      ${pc.cyan(path.relative(projectRoot, pageFile))}`);
console.log(
  `   Component: ${pc.cyan(path.relative(projectRoot, componentFile))}`,
);
console.log(
  pageExists
    ? '\nThe existing page contract was preserved; add this section to its composition if needed.'
    : '\nThe page contract was created and composed with this section.',
);
