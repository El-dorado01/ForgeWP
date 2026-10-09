import { describe, expect, it } from 'vitest';
import { processMarkup } from '../../lib/markup-processor.js';

describe('Markup Processor — WpShortcode', () => {
  it('transpiles shortcode markers into WordPress do_shortcode calls', () => {
    const output = processMarkup(
      '<forgewp-shortcode code="[events_list limit=&quot;10&quot; scope=&quot;future&quot;]" />',
    );

    expect(output).toBe(
      `<?php echo do_shortcode('[events_list limit="10" scope="future"]'); ?>`,
    );
  });

  it('escapes shortcode apostrophes for the generated PHP string', () => {
    const output = processMarkup(
      '<forgewp-shortcode code="[event label=&quot;Roland&#39;s event&quot;]" />',
    );

    expect(output).toBe(
      `<?php echo do_shortcode('[event label="Roland\\'s event"]'); ?>`,
    );
  });
});
