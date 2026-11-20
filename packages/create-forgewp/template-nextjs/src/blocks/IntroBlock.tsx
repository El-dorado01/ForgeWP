'use client';

import { defineBlock, WpEditable } from '@forgewp/react';

export const IntroBlock = defineBlock({
  name: 'hero-intro',
  title: 'Hero Intro',
  category: 'text',
  description: 'Editable hero introduction block for Gutenberg.',
  attributes: {
    heading: {
      type: 'string',
      default: 'Built with Next.js and ForgeWP',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <section className="hero-block">
      <WpEditable
        tagName="h2"
        value={attributes.heading}
        onChange={(value) => setAttributes({ heading: value })}
      />
    </section>
  ),
  save: ({ attributes }) => (
    <section className="hero-block">
      <h2>{attributes.heading}</h2>
    </section>
  ),
});

export default IntroBlock;
