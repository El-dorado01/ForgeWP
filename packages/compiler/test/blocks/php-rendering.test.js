import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { compileBlocks } from '../../lib/blocks/index.js';
import { generatePhpMarkupFromJsx } from '../../lib/blocks/php-transpiler.js';
import {
  jsHelperToPhpFunction,
  jsxHelperToTemplate,
} from '../../lib/blocks/source-sanitize.js';

describe('PHP rendering for dynamic block components', () => {
  it('does not treat a lowercase module constant as the visitor component', () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'forgewp-checkout-benefits-'),
    );
    const themeRoot = path.join(tempRoot, 'theme');
    const outDir = path.join(tempRoot, 'out');
    const blocksDir = path.join(themeRoot, 'src', 'blocks');
    fs.mkdirSync(blocksDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(blocksDir, 'checkout-benefits.tsx'),
        `import { defineBlock, WpEditable } from '@forgewp/react';
const defaultTitle = 'Benefits';
const defaultItems = [{ text: 'First' }];
export default defineBlock({
  name: 'checkout-benefits',
  title: 'Checkout Benefits',
  attributes: {
    title: { type: 'string', default: 'Benefits' },
    items: { type: 'array', default: [{ text: 'First' }] },
  },
  editorPreview: ({ attributes, setAttributes }) => (
    <ul>
      {(attributes.items || defaultItems).map((item, index) => (
        <li key={index}>
          <WpEditable tagName="span" value={item.text} onChange={(text) => setAttributes({ items: text })} />
        </li>
      ))}
    </ul>
  ),
  editorPreviewMode: 'override',
  save: ({ attributes }) => {
    const items = attributes.items || defaultItems;
    return (
      <ul>
        {items.map((item) => <li key={item.text}>{item.text}</li>)}
      </ul>
    );
  },
  edit: () => null,
});`,
        'utf8',
      );

      compileBlocks(themeRoot, outDir);
      const renderPhp = fs.readFileSync(
        path.join(outDir, 'blocks', 'checkout-benefits', 'render.php'),
        'utf8',
      );

      expect(renderPhp).not.toContain("$__v = (item['text']);");
      expect(renderPhp).toContain("echo esc_html( $item['text'] ?? '' );");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('emits a WordPress query loop with per-post hooks and supported filters', () => {
    const php = generatePhpMarkupFromJsx(
      `<WpQueryLoop
        postType="hospitality_event"
        postsPerPage={10}
        order="ASC"
        orderby="date"
        categoryName="news"
        metaKey="featured"
        metaValue="yes"
        metaCompare="EXISTS"
        taxTaxonomy="topic"
        taxTerms="a,b"
        postIn="related"
      >
        <article>
          <WpImage src={useWpFeaturedImage()} alt={useWpTitle()} />
          <h2>{useWpTitle()}</h2>
          <p>{useWpExcerpt()}</p>
          <WpLink href={useWpPermalink()}>Details</WpLink>
          <p>{useWpCustomField('city_label', useWpTitle())}</p>
        </article>
      </WpQueryLoop>`,
      { attributes: {} },
      {},
    );

    expect(php).toContain("sanitize_key((string)('hospitality_event'))");
    expect(php).toContain("'posts_per_page' =>");
    expect(php).toContain("'category_name'");
    expect(php).toContain("'meta_query'");
    expect(php).toContain("array('EXISTS', 'NOT EXISTS')");
    expect(php).toContain("'tax_query'");
    expect(php).toContain("'post__in'");
    expect(php).toContain('get_the_title()');
    expect(php).toContain('get_the_excerpt()');
    expect(php).toContain('get_permalink()');
    expect(php).toContain('get_the_post_thumbnail_url(get_the_ID(),');
    expect(php).toContain("forgewp_get_meta_value('city_label'");
    expect(php).toContain('wp_reset_postdata()');
  });

  it('renders motion elements as static HTML without animation-only props', () => {
    const php = generatePhpMarkupFromJsx(
      `<motion.header
        className="event-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        variants={eventVariants}
      ><h1>Event</h1></motion.header>`,
      { attributes: {} },
      {},
    );

    expect(php).toContain('<header class="event-hero">');
    expect(php).toContain('</header>');
    expect(php).not.toContain('motion.header');
    expect(php).not.toContain('initial=');
    expect(php).not.toContain('animate=');
    expect(php).not.toContain('viewport=');
    expect(php).not.toContain('variants=');
  });

  it('renders framework form submit buttons, icon toggles, and pending states', () => {
    const php = generatePhpMarkupFromJsx(
      `<WpFormSubmitButton
        className="submit-button"
        icon={<span>Arrow</span>}
        showIcon={attributes.showSubmitIcon}
        pending={isSubmitting}
      >Send</WpFormSubmitButton>`,
      {
        attributes: {
          showSubmitIcon: { type: 'boolean', default: true },
        },
      },
      {},
    );

    expect(php).toContain('<button type="submit" class="submit-button"');
    expect(php).toContain('Send');
    expect(php).toContain("$attributes['showSubmitIcon'] ?? true");
    expect(php).toContain('aria-hidden="true"><span>Arrow</span></span>');
    expect(php).toContain('aria-busy="true"');
    expect(php).toContain('disabled');
  });

  it('preserves static Lucide icon dimensions in visitor PHP', () => {
    const php = generatePhpMarkupFromJsx(
      `<Check size={17} className="overview-check" />`,
      {
        attributes: {},
        importMap: { Check: 'lucide-react' },
      },
      {
        themeRoot: fileURLToPath(
          new URL('../../../../hospitality/', import.meta.url),
        ),
      },
    );

    expect(php).toContain('width="17"');
    expect(php).toContain('height="17"');
    expect(php).toContain('class="lucide lucide-check overview-check"');
  });

  it('preserves dynamic classes on framework links and buttons', () => {
    const php = generatePhpMarkupFromJsx(
      `<><WpLink href="/licenses" className={\`inline-flex \${attributes.featured ? 'bg-brand' : 'bg-white'}\`}>Licenses</WpLink><Button className={\`button \${attributes.featured ? 'primary' : 'secondary'}\`}>Buy</Button></>`,
      { attributes: { featured: { type: 'boolean' } } },
      {},
    );

    expect(php).toContain('class="inline-flex <?php echo esc_attr(');
    expect(php).toContain("'bg-brand'");
    expect(php).toContain("'bg-white'");
    expect(php).toContain('Licenses');
    expect(php).toContain('Buy');
    expect(php).toContain("'primary'");
    expect(php).toContain("'secondary'");
  });

  it('emits mapped rows from array literals with tuple destructuring', () => {
    const php = generatePhpMarkupFromJsx(
      `<ul>{[['featureOne', featureOne], ['featureTwo', featureTwo]].map(([field, value]) => (
        <li key={field}><span>{value}</span></li>
      ))}</ul>`,
      {
        attributes: {
          featureOne: { type: 'string' },
          featureTwo: { type: 'string' },
        },
      },
      {},
    );

    expect(php).toContain("foreach ([['featureOne', ($attributes['featureOne'] ?? null)], ['featureTwo', ($attributes['featureTwo'] ?? null)]] as $__forgewp_row_0)");
    expect(php).toContain("$field = ($__forgewp_row_0[0] ?? null);");
    expect(php).toContain("$value = ($__forgewp_row_0[1] ?? null);");
    expect(php).toContain("echo esc_html( $value ?? '' );");
    expect(php).not.toContain('.map(');
  });

  it('emits mapped rows from attribute arrays with object destructuring and indexes', () => {
    const php = generatePhpMarkupFromJsx(
      `<div>{(attributes.requirements || [{ text: 'First' }, { text: 'Second' }]).map(({ text }, index) => (
        <p key={index}>{index}: {text}</p>
      ))}</div>`,
      { attributes: { requirements: { type: 'array' } } },
      {},
    );

    expect(php).toContain("foreach (($attributes['requirements'] ?? array(array('text' => 'First'), array('text' => 'Second'))) as $index => $__forgewp_row_0)");
    expect(php).toContain("$text = ($__forgewp_row_0['text'] ?? null);");
    expect(php).toContain('as $index => $__forgewp_row_0');
    expect(php).toContain("echo esc_html( $index ?? '' );");
    expect(php).toContain("echo esc_html( $text ?? '' );");
    expect(php).not.toContain('.map(');
  });

  it('does not emit unsupported editor callbacks as visitor PHP helpers', () => {
    const callbacks = [
      `const updateCard = (cards, index) => cards.map((card) => ({ ...card, index }));`,
      `const updateCard = (card) => card?.details?.name || '';`,
      `const updateCard = (card) => ({ ...card, active: true });`,
    ];

    for (const callback of callbacks) {
      expect(jsHelperToPhpFunction('forgewp_update_card', callback)).toBeNull();
    }
  });

  it('keeps JSX render helpers with map callbacks eligible for inlining', () => {
    expect(
      jsxHelperToTemplate(
        `const renderCards = (cards) => cards.map((card) => <article>{card.title}</article>);`,
      ),
    ).toBeTruthy();
  });
});
