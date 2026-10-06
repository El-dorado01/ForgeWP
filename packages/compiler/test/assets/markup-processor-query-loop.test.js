import { describe, expect, it } from 'vitest';
import { processMarkup } from '../../lib/markup-processor.js';

describe('Markup Processor — WpQueryLoop', () => {
  it('transpiles CPT loops and custom-field filters to WP_Query', () => {
    const input = [
      '<forgewp-query-loop-start postType="hospitality_event" postsPerPage="10" metaKey="city" metaValue="berlin" metaCompare="=" />',
      '<h2>__FORGEWP_THE_TITLE__</h2>',
      '<p>__FORGEWP_CUSTOM_FIELD__timing__</p>',
      '<forgewp-query-loop-end />',
    ].join('');

    const output = processMarkup(input, 'hospitality');

    expect(output).toContain("'post_type' => 'hospitality_event'");
    expect(output).toContain("'posts_per_page' => 10");
    expect(output).toContain("'key' => 'city'");
    expect(output).toContain("'value' => 'berlin'");
    expect(output).toContain('get_the_title()');
    expect(output).toContain("get_post_meta( get_the_ID(), 'timing', true )");
    expect(output).toContain('wp_reset_postdata()');
  });

  it('adds a single-post ID to the native query', () => {
    const output = processMarkup(
      '<forgewp-query-loop-start postType="hospitality_event" postId="301" /><h1>__FORGEWP_THE_TITLE__</h1><forgewp-query-loop-end />',
      'hospitality',
    );

    expect(output).toContain("'p' => 301");
  });
});

describe('Markup Processor — BlockArea', () => {
  it('replaces the export marker with the WordPress page content call', () => {
    const output = processMarkup(
      '<main><forgewp-block-area data-name="single-license-edd-purchase-button"></forgewp-block-area></main>',
      'hospitality',
    );

    expect(output).toBe('<main><?php the_content(); ?></main>');
  });
});
