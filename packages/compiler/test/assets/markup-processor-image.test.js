import { describe, it, expect } from 'vitest';
import { processMarkup } from '../../lib/markup-processor.js';

describe('Markup Processor — WpImage Transpilation', () => {
  it('transpiles attachment ID with priority (fetchpriority="high", loading="eager")', () => {
    const input = '<forgewp-image data-id="101" data-size="large" data-class-name="hero-img" data-alt="Hero Image" data-priority="true" data-sizes="(max-width: 768px) 100vw, 50vw"></forgewp-image>';
    const output = processMarkup(input);

    expect(output).toContain("wp_get_attachment_image( 101, 'large', false");
    expect(output).toContain("'class' => 'hero-img'");
    expect(output).toContain("'alt' => 'Hero Image'");
    expect(output).toContain("'sizes' => '(max-width: 768px) 100vw, 50vw'");
    expect(output).toContain("'fetchpriority' => 'high'");
    expect(output).toContain("'loading' => 'eager'");
  });

  it('transpiles featuredImage with standard lazy loading and async decoding', () => {
    const input = '<forgewp-image data-field="featuredImage" data-size="medium" data-class-name="post-thumb" data-alt="Post Thumbnail" data-loading="lazy" data-decoding="async"></forgewp-image>';
    const output = processMarkup(input);

    expect(output).toContain("wp_get_attachment_image( get_post_thumbnail_id( get_the_ID() ), 'medium', false");
    expect(output).toContain("'class' => 'post-thumb'");
    expect(output).toContain("'loading' => 'lazy'");
    expect(output).toContain("'decoding' => 'async'");
  });

  it('transpiles local static image paths to get_theme_file_uri', () => {
    const input = '<forgewp-image data-src="/assets/images/logo.png" data-class-name="site-logo" data-alt="Brand Logo" data-width="200" data-height="50"></forgewp-image>';
    const output = processMarkup(input);

    expect(output).toContain("get_theme_file_uri( 'assets/images/logo.png' )");
    expect(output).toContain('class="site-logo"');
    expect(output).toContain('alt="Brand Logo"');
    expect(output).toContain('width="200"');
    expect(output).toContain('height="50"');
  });

  it('transpiles external URLs with decoding="async"', () => {
    const input = '<forgewp-image data-src="https://images.unsplash.com/photo-test" data-class-name="external-photo" data-alt="External Photo" data-width="800" data-height="600"></forgewp-image>';
    const output = processMarkup(input);

    expect(output).toContain('src="https://images.unsplash.com/photo-test"');
    expect(output).toContain('class="external-photo"');
    expect(output).toContain('alt="External Photo"');
    expect(output).toContain('width="800"');
    expect(output).toContain('height="600"');
    expect(output).toContain('decoding="async"');
  });
});
