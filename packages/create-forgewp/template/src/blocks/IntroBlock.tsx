import { defineBlock, WpEditable } from "@forgewp/react";

/**
 * Example Gutenberg block. After `pnpm forgewp export` it appears in the block
 * inserter as "Example: Hero". Both fields are edited inline in Gutenberg:
 * <WpEditable> compiles to <RichText> in the editor and escaped HTML for visitors.
 *
 * Create your own with `pnpm forgewp make:block <Name>`, then delete this one.
 */
export default defineBlock({
  name: "hero-intro",
  title: "Example: Hero",
  category: "text",
  icon: "cover-image",
  description: "Example block with an editable heading and text.",
  attributes: {
    heading: { type: "string", default: "Built with ForgeWP" },
    text: { type: "string", default: "Edit this text inline in Gutenberg." },
  },
  edit: ({ attributes, setAttributes }) => (
    <section className="hero-intro">
      <WpEditable
        tagName="h2"
        value={attributes.heading}
        onChange={(value) => setAttributes({ heading: value })}
      />
      <WpEditable
        tagName="p"
        value={attributes.text}
        onChange={(value) => setAttributes({ text: value })}
      />
    </section>
  ),
  save: ({ attributes }) => (
    <section className="hero-intro">
      <h2>{attributes.heading}</h2>
      <p>{attributes.text}</p>
    </section>
  ),
});
