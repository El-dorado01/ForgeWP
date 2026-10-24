import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WpQueryLoop } from '../../../react/src/components/WpQueryLoop.tsx';
import { useWpTitle } from '../../../react/src/hooks.ts';
import { processMarkup } from '../../lib/markup-processor.js';

const posts = [
  { id: 1, title: 'First', date: '2026-01-01', customFields: { featured: 'yes' } },
  { id: 2, title: 'Second', date: '2026-02-01', customFields: { featured: 'no' } },
  { id: 3, title: 'Third', date: '2026-03-01', customFields: { featured: 'yes' } },
];
function Title() { return React.createElement('h2', null, useWpTitle()); }
const render = (props) => renderToStaticMarkup(React.createElement(WpQueryLoop, { posts, ...props }, React.createElement(Title)));
afterEach(() => vi.unstubAllGlobals());
describe('featured selection versus full listings', () => {
  it('caps and orders a featured selection without changing the full listing', () => {
    const promoted = render({ postsPerPage: 1, metaKey: 'featured', metaValue: 'yes', orderby: 'date', order: 'DESC' });
    expect(promoted).toBe('<h2>Third</h2>');
    expect(render({ postsPerPage: -1, orderby: 'date', order: 'ASC' })).toBe('<h2>First</h2><h2>Second</h2><h2>Third</h2>');
    expect(posts.map((post) => post.id)).toEqual([1, 2, 3]);
  });
  it('retains the single matching result when all matches are requested', () => {
    expect(render({ posts: [posts[0]], postsPerPage: -1 })).toBe('<h2>First</h2>');
    expect(render({ posts: [], postsPerPage: -1 })).toBe('');
  });
  it('passes explicit ordering and count through the actual React export marker into PHP', () => {
    vi.stubGlobal('window', { _forgeWpCompileTime: true });
    const marker = render({ postType: 'project', postsPerPage: 2, orderby: 'title', order: 'ASC', metaKey: 'featured', metaValue: 'yes' });
    const php = processMarkup(marker, 'test');
    expect(php).toContain("'orderby' => 'title'");
    expect(php).toContain("'order' => 'ASC'");
    expect(php).toContain("'posts_per_page' => 2");
    expect(php).toContain("'key' => 'featured'");
  });
  it('keeps the all-results sentinel in exported PHP', () => {
    vi.stubGlobal('window', { _forgeWpCompileTime: true });
    expect(processMarkup(render({ postsPerPage: -1 }), 'test')).toContain("'posts_per_page' => -1");
  });
});
