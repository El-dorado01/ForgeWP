import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';

let tmpRoot;
let blocksBySlug;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-editor-preview-'));
  const themeRoot = path.join(tmpRoot, 'theme');
  const outDir = path.join(tmpRoot, 'out');
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  const componentsDir = path.join(themeRoot, 'src', 'components');
  fs.mkdirSync(blocksDir, { recursive: true });
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(componentsDir, 'InquiryForm.tsx'),
    `import { useState } from 'react';
export default function InquiryForm() {
  const [sent, setSent] = useState(false);
  return <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><button type="submit">Send</button>{sent && <p>Sent</p>}</form>;
}`,
  );
  fs.writeFileSync(
    path.join(componentsDir, 'InteractivePanel.tsx'),
    `import { useState } from 'react';
export default function InteractivePanel() {
  const [open, setOpen] = useState(false);
  return <section onClick={() => setOpen(!open)}>{open ? 'Open' : 'Closed'}</section>;
}`,
  );
  fs.writeFileSync(
    path.join(componentsDir, 'StaticPanel.tsx'),
    `export default function StaticPanel() {
  return <section><h2>Visitor heading</h2><p>Visitor content</p></section>;
}`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'inquiry-form.tsx'),
    `import { defineBlock } from '@forgewp/react';
import InquiryForm from '../components/InquiryForm';
export default defineBlock({
  name: 'inquiry-form-section',
  title: 'Inquiry Form',
  attributes: { heading: { type: 'string', default: 'Contact us' } },
  edit: () => null,
  editorPreview: ({ attributes }) => <section><h2>{attributes.heading}</h2><label>Name<input disabled /></label><button disabled>Send request</button></section>,
  save: () => <InquiryForm />,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'interactive-panel.tsx'),
    `import { defineBlock } from '@forgewp/react';
import InteractivePanel from '../components/InteractivePanel';
export default defineBlock({
  name: 'interactive-panel',
  title: 'Interactive Panel',
  edit: () => null,
  save: () => <InteractivePanel />,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'static-panel.tsx'),
    `import { defineBlock } from '@forgewp/react';
import StaticPanel from '../components/StaticPanel';
export default defineBlock({
  name: 'static-panel',
  title: 'Static Panel',
  editorPreview: () => <section><h2>Editor preview</h2></section>,
  save: () => <StaticPanel />,
});`,
  );

  const blocks = compileBlocks(themeRoot, outDir, {});
  blocksBySlug = new Map(
    blocks.map((block) => [block.name.replace(/^forgewp\//, ''), block]),
  );
});

afterAll(() => {
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('interactive block editor previews', () => {
  it('uses an explicitly authored preview instead of the generic notice', () => {
    const preview = blocksBySlug.get('inquiry-form-section').customEditJsx;
    expect(preview).toContain('attributes.heading');
    expect(preview).toContain('Name');
    expect(preview).not.toContain('forgewp-editor-island-placeholder');

    const renderPhp = fs.readFileSync(
      path.join(tmpRoot, 'out', 'blocks', 'inquiry-form-section', 'render.php'),
      'utf8',
    );
    expect(renderPhp).toContain('data-forgewp-hydrate="inquiry-form"');
    expect(renderPhp).not.toContain(
      'data-forgewp-hydrate="inquiry-form-section"',
    );
    expect(renderPhp).not.toContain('Send request');

    const blockJson = JSON.parse(
      fs.readFileSync(
        path.join(
          tmpRoot,
          'out',
          'blocks',
          'inquiry-form-section',
          'block.json',
        ),
        'utf8',
      ),
    );
    expect(blockJson.attributes.heading.default).toBe('Contact us');
    expect(blockJson).not.toHaveProperty('editorPreview');
  });

  it('uses WordPress server rendering for interactive blocks without a preview', () => {
    expect(blocksBySlug.get('interactive-panel').customEditJsx).toBeUndefined();
  });

  it('accepts an explicit editor preview for non-interactive blocks', () => {
    expect(blocksBySlug.get('static-panel').customEditJsx).toContain(
      'Editor preview',
    );
  });

  it('falls back to WordPress server rendering for custom preview errors', () => {
    const editorRuntime = fs.readFileSync(
      new URL('../../lib/generate-theme.js', import.meta.url),
      'utf8',
    );
    expect(editorRuntime).toContain('falling back to WordPress server rendering');
    expect(editorRuntime).toContain('createElement(ServerSideRender, {');
    expect(editorRuntime).not.toContain('ref is not defined');
    expect(editorRuntime).not.toContain("createElement('div', blockProps, 'Render Error: ' + e.message)");
  });
});
