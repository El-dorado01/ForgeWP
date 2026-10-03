/**
 * A page that owns its document (blank layout) rendered the shell itself.
 * Extraction must keep that tree — whatever the nav component is called —
 * so the page island still hydrates. Default layouts still keep only <main>.
 */
import { describe, expect, it } from 'vitest';
import { extractTemplateContent } from '../../lib/extract-template-content.js';

const owned = `
<forgewp-content-boundary data-forgewp-owns-shell="true">
  <div data-forgewp-hydrate="page" style="display:contents">
    <header><nav class="custom-nav">CustomNav</nav></header>
    <main><section>hero</section><section>next</section></main>
    <footer>page footer</footer>
  </div>
</forgewp-content-boundary>`;

describe('extractTemplateContent', () => {
  it('keeps the page island and its shell when the boundary owns the document', () => {
    const html = extractTemplateContent(owned, '<header>layout</header>', '<footer>layout</footer>');
    expect(html).toContain('data-forgewp-hydrate="page"');
    expect(html).toContain('CustomNav');
    expect(html).toContain('<footer>page footer</footer>');
    expect(html).toContain('<section>next</section>');
    expect(html).not.toContain('layout');
  });

  it('keeps the shell when the caller passes ownsShell, even without the attribute', () => {
    const html = extractTemplateContent(
      owned.replace(' data-forgewp-owns-shell="true"', ''),
      '',
      '',
      { ownsShell: true },
    );
    expect(html).toContain('data-forgewp-hydrate="page"');
    expect(html).toContain('CustomNav');
  });

  it('strips a shared header and footer down to <main> when the page does not own the shell', () => {
    const html = extractTemplateContent(
      owned.replace(' data-forgewp-owns-shell="true"', ''),
      '',
      '',
    );
    expect(html).toContain('<section>hero</section>');
    expect(html).not.toContain('CustomNav');
    expect(html).not.toContain('data-forgewp-hydrate="page"');
    expect(html).not.toContain('<footer>page footer</footer>');
  });

  it('keeps a page island that the default layout already placed inside <main>', () => {
    const markup = `
      <header>layout nav</header>
      <main>
        <forgewp-content-boundary>
          <div data-forgewp-hydrate="page">page body</div>
        </forgewp-content-boundary>
      </main>
      <footer>layout foot</footer>`;
    const html = extractTemplateContent(markup, '', '');
    expect(html).toContain('data-forgewp-hydrate="page"');
    expect(html).toContain('page body');
    expect(html).not.toContain('layout nav');
    expect(html).not.toContain('layout foot');
  });

  it('keeps a nested page <main> closed so the layout footer stays outside the island', () => {
    const markup = `
      <div class="forgewp-root">
        <forgewp-content-boundary>
          <div class="flex min-h-screen flex-col">
            <header>layout nav</header>
            <main class="flex-1">
              <div data-forgewp-hydrate="die-studie-page" style="display:contents">
                <main class="min-h-screen">study body</main>
              </div>
            </main>
            <footer>layout foot</footer>
          </div>
        </forgewp-content-boundary>
      </div>`;
    const html = extractTemplateContent(markup, '', '');
    expect(html).toContain('data-forgewp-hydrate="die-studie-page"');
    expect(html).toContain('<main class="min-h-screen">study body</main>');
    expect(html).toContain('</div>');
    expect(html).not.toContain('layout nav');
    expect(html).not.toContain('layout foot');
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/<\/main>/g)).toHaveLength(1);
    expect(html.match(/<div\b/g)).toHaveLength(html.match(/<\/div>/g).length);
  });

  it('keeps the page island when the page itself roots at <main>', () => {
    const markup = `
      <div class="layout">
        <header>layout nav</header>
        <main class="flex-1">
          <forgewp-content-boundary>
            <div data-forgewp-hydrate="die-studie-page" style="display:contents">
              <main class="min-h-screen">study body<footer>in page</footer></main>
            </div>
          </forgewp-content-boundary>
        </main>
        <footer>layout foot</footer>
      </div>`;
    const html = extractTemplateContent(markup, '', '');
    expect(html).toContain('data-forgewp-hydrate="die-studie-page"');
    expect(html).toContain('<main class="min-h-screen">study body<footer>in page</footer></main>');
    expect(html).not.toContain('layout nav');
    expect(html).not.toContain('layout foot');
    expect(html.match(/<div\b/g)).toHaveLength(html.match(/<\/div>/g).length);
  });
});
