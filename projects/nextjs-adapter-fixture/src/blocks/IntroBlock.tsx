'use client';
import { defineBlock, WpEditable } from '@forgewp/react';

export default defineBlock({
  name: 'next-intro',
  title: 'Next Intro',
  category: 'text',
  attributes: { heading: { type: 'string', default: 'An editable introduction' } },
  edit: ({ attributes, setAttributes }) => {
    return (
      <section className="intro">
        <WpEditable tagName="h2" value={attributes.heading}
          onChange={(value) => setAttributes({ heading: value })} />
      </section>
    );
  },
  save: ({ attributes }) => {
    return <section className="intro"><h2>{attributes.heading}</h2></section>;
  },
});
