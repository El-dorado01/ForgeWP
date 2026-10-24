import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useWpCustomField, useWpMeta } from '../../../react/src/hooks.ts';
import { BlockArea } from '../../../react/src/components/BlockArea.tsx';
import { WpPostContext } from '../../../react/src/context.ts';

const heading = {
  name: 'heading', title: 'Heading',
  attributes: { text: { type: 'string', default: 'Default heading' } },
  edit: ({ attributes }) => React.createElement('h2', null, attributes.text),
};
const shell = {
  name: 'shell', title: 'Shell', edit: () => null,
  innerBlocks: { allowedBlocks: ['heading'] },
  shell: { className: 'outer', gridClassName: 'grid' },
};
const previewBlocks = { 'forgewp/heading': heading, shell };
function render(content, blocks = previewBlocks) {
  return renderToStaticMarkup(React.createElement(WpPostContext.Provider, {
    value: { id: 1, title: 'Current post', content, customFields: { location: 'Room A' } },
  }, React.createElement(BlockArea, { name: 'body', previewBlocks: blocks })));
}
describe('local BlockArea block-tree preview', () => {
  it('renders sibling attributes in saved order and applies schema defaults', () => {
    const html = render('<!-- wp:forgewp/heading {"text":"First"} /--><!-- wp:forgewp/heading /-->');
    expect(html).toBe('<div><h2>First</h2><h2>Default heading</h2></div>');
  });
  it('preserves nested shell hierarchy and compiler layout classes', () => {
    const html = render('<!-- wp:forgewp/shell --><!-- wp:forgewp/heading {"text":"Child"} /--><!-- /wp:forgewp/shell -->');
    expect(html).toContain('<div class="forgewp-block-shell outer"><div class="forgewp-block-shell__grid grid" style="min-width:0"><h2>Child</h2></div></div>');
  });
  it('preserves core layout markup with dynamic children in their original positions', () => {
    const html = render('<!-- wp:group --><section class="saved-group"><p>Before</p><!-- wp:forgewp/heading {"text":"Inside"} /--><p>After</p></section><!-- /wp:group -->');
    expect(html).toContain('<section class="saved-group"><p>Before</p><h2>Inside</h2><p>After</p></section>');
  });
  it('keeps ordinary HTML and saved core text without serialized comments', () => {
    expect(render('<p>Classic</p><!-- wp:paragraph --><p>Core</p><!-- /wp:paragraph -->')).toBe('<div><p>Classic</p><p>Core</p></div>');
  });
  it('shows unknown and dynamic core blocks as named placeholders, preserving known children', () => {
    const html = render('<!-- wp:plugin/layout --><!-- wp:forgewp/heading {"text":"Child"} /--><!-- /wp:plugin/layout --><!-- wp:latest-posts /-->');
    expect(html).toContain('Local preview unavailable: plugin/layout');
    expect(html).toContain('<h2>Child</h2>');
    expect(html).toContain('Local preview unavailable: core/latest-posts');
    expect(html).not.toContain('<!-- wp:');
  });
  it('does not require a registry for plain HTML and makes missing definitions visible', () => {
    expect(render('<p>HTML</p>', {})).toBe('<div><p>HTML</p></div>');
    expect(render('<!-- wp:forgewp/heading /-->', {})).toContain('Local preview unavailable: forgewp/heading');
  });
  it('prefers the save renderer when provided, matching visitor output', () => {
    const block = { ...heading, save: ({ attributes }) => React.createElement('p', null, attributes.text) };
    expect(render('<!-- wp:forgewp/heading /-->', { 'forgewp/heading': block })).toBe('<div><p>Default heading</p></div>');
  });
  it('handles malformed attribute JSON without rendering serialized comments or crashing', () => {
    const html = render('<!-- wp:forgewp/heading {broken} /-->');
    expect(html).not.toContain('<!-- wp:');
  });
  it('retains the existing empty-content placeholder', () => {
    expect(render('')).toContain('Editorial Block Slot');
  });
  it('keeps metadata hooks attached to the current post context', () => {
    const block = { ...heading, edit: () => React.createElement('p', null, useWpCustomField('location')) };
    expect(render('<!-- wp:forgewp/heading /-->', { heading: block })).toBe('<div><p>Room A</p></div>');
  });
  it('supplies saved block attributes to block-context metadata readers', () => {
    const block = { ...heading, edit: () => React.createElement('p', null, useWpMeta('text', 'Fallback')) };
    expect(render('<!-- wp:forgewp/heading {"text":"Saved value"} /-->', { heading: block })).toBe('<div><p>Saved value</p></div>');
  });
  it('keeps the compiler marker path independent of local rendering', () => {
    vi.stubGlobal('window', { _forgeWpCompileTime: true });
    try {
      expect(render('<!-- wp:forgewp/heading /-->')).toBe('<forgewp-block-area data-name="body"></forgewp-block-area>');
    } finally { vi.unstubAllGlobals(); }
  });
});
