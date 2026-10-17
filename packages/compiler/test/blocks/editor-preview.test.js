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
    path.join(componentsDir, 'AnimatedPanel.tsx'),
    `export default function AnimatedPanel() {
  return <motion.div className="animated" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Animation</motion.div>;
}`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'same-file-editor-primitives.tsx'),
    `import { defineBlock, WpEditable, WpImage, WpLink } from '@forgewp/react';
import AnimatedPanel from '../components/AnimatedPanel';
function EditorFrame({ children, ...props }) {
  return <section {...props}>{children}</section>;
}
export default defineBlock({
  name: 'same-file-editor-primitives',
  title: 'Same-file Editor Primitives',
  attributes: {
    heading: { type: 'string', default: 'Editable heading' },
    cover: { type: 'object', default: { url: '/assets/cover.jpg', alt: 'Cover image' } },
    targetUrl: { type: 'string', default: '/destination' },
  },
  edit: ({ attributes, setAttributes }) => (
    <EditorFrame className="editor-frame" data-layout="stacked">
      <WpEditable tagName="h2" value={attributes.heading} onChange={(value) => setAttributes({ heading: value })} />
      <WpImage src={attributes.cover} alt="Fallback image" className="editor-image" />
      <WpLink href={attributes.targetUrl} className="editor-link">Visit</WpLink>
      <AnimatedPanel />
    </EditorFrame>
  ),
  save: ({ attributes }) => <EditorFrame><WpEditable tagName="h2" value={attributes.heading} /></EditorFrame>,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'same-file-aliased-editor-component.tsx'),
    `import { defineBlock, WpEditable, WpLink } from '@forgewp/react';
function InquiryHeading({ heading: title = 'Fallback heading', setAttributes }) {
  return <WpEditable tagName="h1" value={title} onChange={(value) => setAttributes({ heading: value })} />;
}
function StaticBackLink() {
  return <WpLink href="/licenses">All licenses</WpLink>;
}
export default defineBlock({
  name: 'same-file-aliased-editor-component',
  title: 'Same-file Aliased Editor Component',
  attributes: {
    heading: { type: 'string', default: 'Editable heading' },
  },
  edit: ({ attributes, setAttributes }) => (
    <section>
      <InquiryHeading {...attributes} setAttributes={setAttributes} />
      <StaticBackLink />
    </section>
  ),
  save: () => null,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'plain-link-panel.tsx'),
    `import { defineBlock, WpEditable } from '@forgewp/react';
export default defineBlock({
  name: 'plain-link-panel',
  title: 'Plain Link Panel',
  attributes: {
    buyLabel: { type: 'string', default: 'Buy now' },
    buyUrl: { type: 'string', control: 'url', label: 'Purchase URL', default: '#buy' },
    items: { type: 'array', default: [{ url: '/a', label: 'A' }] },
  },
  edit: ({ attributes, setAttributes }) => (
    <section>
      <a href={attributes.buyUrl || '#buy'} className="buy">
        <WpEditable tagName="span" value={attributes.buyLabel} onChange={(value) => setAttributes({ buyLabel: value })} />
      </a>
      {attributes.items.map((item) => <a key={item.url} href={item.url}>{item.label}</a>)}
    </section>
  ),
  save: () => null,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'asset-link-panel.tsx'),
    `import { defineBlock, resolveWpAsset } from '@forgewp/react';
export default defineBlock({
  name: 'asset-link-panel',
  title: 'Asset Link Panel',
  attributes: { previewUrl: { type: 'string', default: '/assets/preview.pdf' } },
  edit: ({ attributes }) => <section><a href={resolveWpAsset(attributes.previewUrl)}>Open preview</a></section>,
  save: () => null,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'motion-only-panel.tsx'),
    `import { defineBlock } from '@forgewp/react';
export default defineBlock({
  name: 'motion-only-panel',
  title: 'Motion Only Panel',
  edit: () => <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Static content</motion.section>,
  save: () => <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Static content</motion.section>,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'interactive-motion-panel.tsx'),
    `import { defineBlock } from '@forgewp/react';
export default defineBlock({
  name: 'interactive-motion-panel',
  title: 'Interactive Motion Panel',
  edit: () => <motion.section onClick={() => {}}>Interactive content</motion.section>,
  save: () => <motion.section onClick={() => {}}>Interactive content</motion.section>,
});`,
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
  edit: () => <StaticPanel />,
  editorPreview: () => <section><h2>Editor preview</h2></section>,
  save: () => <StaticPanel />,
});`,
  );
  fs.writeFileSync(
    path.join(blocksDir, 'override-panel.tsx'),
    `import { defineBlock } from '@forgewp/react';
import StaticPanel from '../components/StaticPanel';
export default defineBlock({
  name: 'override-panel',
  title: 'Override Panel',
  editorPreviewMode: 'override',
  edit: () => <StaticPanel />,
  editorPreview: () => <section><h2>Editor override</h2></section>,
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

  it('uses the block edit component as the shared editor canvas by default', () => {
    expect(blocksBySlug.get('static-panel').customEditJsx).toContain(
      'Visitor heading',
    );
    expect(blocksBySlug.get('static-panel').customEditJsx).not.toContain(
      'Editor preview',
    );
  });

  it('allows editorPreview to override a shared edit component explicitly', () => {
    expect(blocksBySlug.get('override-panel').customEditJsx).toContain(
      'Editor override',
    );
  });

  it('expands same-file components with children, media, links, and static nested motion markup', () => {
    const preview = blocksBySlug.get('same-file-editor-primitives').customEditJsx;

    expect(preview).toContain('wp.blockEditor.RichText');
    expect(preview).toContain('forgeWpResolveEditorImage(attributes.cover)');
    expect(preview).toContain(
      'forgeWpEditorImageAlt(attributes.cover, "Fallback image")',
    );
    expect(preview).toContain('href: attributes.targetUrl');
    expect(preview).toContain('createElement(ForgeWpEditorLink');
    expect(preview).toContain('setAttributes({ targetUrl: value })');
    expect(preview).toContain('"editor-frame"');
    expect(preview).toContain('"data-layout": "stacked"');
    expect(preview).toContain('createElement("div"');
    expect(preview).toContain('Animation');
    expect(preview).not.toContain('animate:');
    expect(preview).not.toContain('initial:');
  });

  it('inlines same-file editor helpers with aliased attributes and zero-prop helpers', () => {
    const preview = blocksBySlug.get(
      'same-file-aliased-editor-component',
    ).customEditJsx;

    expect(preview).toContain('attributes.heading');
    expect(preview).toContain('setAttributes({ heading: value })');
    expect(preview).toContain('createElement(ForgeWpEditorLink');
    expect(preview).toContain('All licenses');
    expect(preview).not.toContain('InquiryHeading');
    expect(preview).not.toContain('StaticBackLink');
  });

  it('keeps visual motion in the editor canvas but leaves interactive handlers to WordPress rendering', () => {
    const motionPreview = blocksBySlug.get('motion-only-panel').customEditJsx;
    expect(motionPreview).toContain('createElement("section"');
    expect(motionPreview).toContain('Static content');
    expect(motionPreview).not.toContain('animate:');

    expect(
      blocksBySlug.get('interactive-motion-panel').customEditJsx,
    ).toBeUndefined();
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

  it('renders plain anchors as non-navigating canvas links with inline URL editing for bound attributes', () => {
    const preview = blocksBySlug.get('plain-link-panel').customEditJsx;
    expect(preview).not.toContain('createElement("a"');
    expect(preview).toContain('createElement(ForgeWpEditorLink');
    // Attribute-bound href → URL editable via the link popover; label stays RichText.
    expect(preview).toContain('forgeWpUrl: attributes.buyUrl');
    expect(preview).toContain('setAttributes({ buyUrl: value })');
    expect(preview).toContain('forgeWpUrlLabel: "Purchase URL"');
    expect(preview).toContain('wp.blockEditor.RichText');
    // Loop-row hrefs only get the navigation guard.
    expect(preview).not.toContain('setAttributes({ url: value })');

    const editorRuntime = fs.readFileSync(
      new URL('../../lib/generate-theme.js', import.meta.url),
      'utf8',
    );
    expect(editorRuntime).toContain('function ForgeWpEditorLink(props)');
    expect(editorRuntime).toContain(
      'onClickCapture: function (event) { event.preventDefault(); }',
    );
    expect(editorRuntime).toContain('event.preventDefault();');
    expect(editorRuntime).toContain(
      "'forgeWpResolveEditorImage', 'forgeWpEditorImageAlt', 'ForgeWpEditorLink'",
    );
    expect(editorRuntime).toContain(
      'forgeWpResolveEditorImage, forgeWpEditorImageAlt, ForgeWpEditorLink,',
    );
  });

  it('supports theme asset URL resolution in custom editor previews', () => {
    const preview = blocksBySlug.get('asset-link-panel').customEditJsx;
    expect(preview).toContain('href: resolveWpAsset(attributes.previewUrl)');

    const editorRuntime = fs.readFileSync(
      new URL('../../lib/generate-theme.js', import.meta.url),
      'utf8',
    );
    expect(editorRuntime).toContain('function resolveWpAsset(path)');
    expect(editorRuntime).toContain("'resolveWpAsset'");
    expect(editorRuntime).toContain('resolveWpAsset, forgeWpResolveEditorImage');
  });
});
