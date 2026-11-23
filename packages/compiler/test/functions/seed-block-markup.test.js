/**
 * Seeded mock content used to be inserted as raw HTML, so Gutenberg opened it
 * as a single Classic (core/freeform) block. htmlToBlockMarkup() converts
 * attribute-free top-level elements into core blocks; output verified valid in
 * the WordPress 7.1 editor (cloud E2E sandbox).
 */
import { describe, it, expect } from 'vitest';
import { htmlToBlockMarkup } from '../../lib/functions/seed-mock-data.js';

describe('htmlToBlockMarkup', () => {
  it('converts paragraphs, headings, lists, quotes and separators to core blocks', () => {
    const out = htmlToBlockMarkup('<p>A <a href="/x">link</a></p><h2>Two</h2><h3>Three</h3><ul><li>a</li><li>b</li></ul><blockquote><p>q</p></blockquote><hr/>');
    expect(out).toContain('<!-- wp:paragraph -->\n<p>A <a href="/x">link</a></p>\n<!-- /wp:paragraph -->');
    expect(out).toContain('<!-- wp:heading -->\n<h2 class="wp-block-heading">Two</h2>');
    expect(out).toContain('<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Three</h3>');
    expect(out).toContain('<ul class="wp-block-list"><!-- wp:list-item -->\n<li>a</li>');
    expect(out).toContain('<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>q</p></blockquote>');
    expect(out).toContain('<!-- wp:separator -->');
  });

  it('wraps elements with attributes, unknown elements and stray text in html blocks', () => {
    const out = htmlToBlockMarkup('<h2 id="x">Anchored</h2><div><div>nested</div></div>loose text');
    expect(out).toContain('<!-- wp:html -->\n<h2 id="x">Anchored</h2>\n<!-- /wp:html -->');
    expect(out).toContain('<!-- wp:html -->\n<div><div>nested</div></div>\n<!-- /wp:html -->');
    expect(out).toContain('<!-- wp:html -->\nloose text\n<!-- /wp:html -->');
  });

  it('leaves existing block markup, malformed HTML and empty content unchanged', () => {
    const blockMarkup = '<!-- wp:paragraph --><p>kept</p><!-- /wp:paragraph -->';
    expect(htmlToBlockMarkup(blockMarkup)).toBe(blockMarkup);
    expect(htmlToBlockMarkup('<p>unclosed')).toBe('<p>unclosed');
    expect(htmlToBlockMarkup('<!-- note --><p>x</p>')).toBe('<!-- note --><p>x</p>');
    expect(htmlToBlockMarkup('')).toBe('');
  });
});
