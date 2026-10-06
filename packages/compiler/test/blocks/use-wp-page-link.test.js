import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';

let tempRoot;

afterEach(() => {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
});

describe('useWpPageLink() block rendering', () => {
  it('resolves multiline calls with a trailing comma in generated PHP', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-page-link-'));
    const themeRoot = path.join(tempRoot, 'theme');
    const outDir = path.join(tempRoot, 'out');
    const blocksDir = path.join(themeRoot, 'src', 'blocks');
    fs.mkdirSync(blocksDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(blocksDir, 'RouteLink.tsx'),
      `import { defineBlock, useWpPageLink, WpLink } from '@forgewp/react';

function RouteLink() {
  const href = useWpPageLink(
    'legal-page',
    '/legal',
  );
  return <WpLink href={href}>Legal</WpLink>;
}

export default defineBlock({
  name: 'route-link',
  title: 'Route Link',
  category: 'theme',
  edit: () => <RouteLink />,
  save: () => <RouteLink />,
});
`,
      'utf8',
    );

    compileBlocks(themeRoot, outDir, {});

    const renderPhp = fs.readFileSync(
      path.join(outDir, 'blocks', 'route-link', 'render.php'),
      'utf8',
    );
    expect(renderPhp).toContain(
      "$href = forgewp_resolve_page_link('legal-page', '/legal');",
    );
  });

  it('renders imported typed components that contain WpEditable fields', () => {
    tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'forgewp-editable-render-'),
    );
    const themeRoot = path.join(tempRoot, 'theme');
    const outDir = path.join(tempRoot, 'out');
    const blocksDir = path.join(themeRoot, 'src', 'blocks');
    const componentsDir = path.join(themeRoot, 'src', 'components');
    fs.mkdirSync(blocksDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(componentsDir, 'EditableHeading.tsx'),
      `import { WpEditable } from '@forgewp/react';

type EditableHeadingProps = {
  heading?: string;
  setAttributes?: (attributes: Partial<EditableHeadingProps>) => void;
};

function EditableHeading({ heading = 'Page heading', setAttributes }: EditableHeadingProps) {
  return <section><WpEditable tagName='h1' value={heading} onChange={(value) => setAttributes?.({ heading: value })} /></section>;
}

export default EditableHeading;
`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(blocksDir, 'EditablePage.tsx'),
      `import { defineBlock } from '@forgewp/react';
import EditableHeading from '../components/EditableHeading';

export default defineBlock({
  name: 'editable-page',
  title: 'Editable Page',
  category: 'theme',
  attributes: { heading: { type: 'string', default: 'Page heading' } },
  edit: () => null,
  save: () => <EditableHeading />,
});
`,
      'utf8',
    );

    compileBlocks(themeRoot, outDir, {});

    const renderPhp = fs.readFileSync(
      path.join(outDir, 'blocks', 'editable-page', 'render.php'),
      'utf8',
    );
    expect(renderPhp).toContain('<section class=');
    expect(renderPhp).toContain('<h1>');
    expect(renderPhp).toContain("$attributes['heading'] ?? ''");
  });

  it('renders same-file block components that contain WpEditable fields', () => {
    tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'forgewp-same-file-block-'),
    );
    const themeRoot = path.join(tempRoot, 'theme');
    const outDir = path.join(tempRoot, 'out');
    const blocksDir = path.join(themeRoot, 'src', 'blocks');
    fs.mkdirSync(blocksDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(blocksDir, 'EditablePage.tsx'),
      `import { defineBlock, WpEditable } from '@forgewp/react';

type EditableHeadingProps = {
  heading?: string;
  setAttributes?: (attributes: Partial<EditableHeadingProps>) => void;
};

function EditableHeading({ heading = 'Page heading', setAttributes }: EditableHeadingProps) {
  return <section><WpEditable tagName='h1' value={heading} onChange={(value) => setAttributes?.({ heading: value })} /></section>;
}

export default defineBlock({
  name: 'editable-page',
  title: 'Editable Page',
  category: 'theme',
  attributes: { heading: { type: 'string', default: 'Page heading' } },
  edit: () => <EditableHeading />,
  save: () => <EditableHeading />,
});
`,
      'utf8',
    );

    compileBlocks(themeRoot, outDir, {});

    const renderPhp = fs.readFileSync(
      path.join(outDir, 'blocks', 'editable-page', 'render.php'),
      'utf8',
    );
    expect(renderPhp).toContain('<section class=');
    expect(renderPhp).toContain('<h1>');
    expect(renderPhp).toContain("$attributes['heading'] ?? ''");
  });
});
