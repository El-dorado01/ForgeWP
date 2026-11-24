/**
 * R5 parity: one field of each kind the editables resource normalizes.
 * Plain object (no helper imports): in Next.js Server Components
 * '@forgewp/react' resolves to the server entry, which does not export
 * defineEditable()/text()/… yet (status doc §9d).
 */
export const editable = {
  about_tagline: { type: 'text', label: 'Tagline', default: 'Built twice, rendered once.' },
  about_intro: { type: 'richText', label: 'Intro', default: 'Default intro.' },
  about_founded: { type: 'number', label: 'Founded', default: 2021 },
  about_hero: { type: 'image', label: 'Hero image' },
  about_team: {
    type: 'repeater',
    label: 'Team',
    mode: 'dynamic',
    fields: { name: { type: 'text', label: 'Name', default: '' }, role: { type: 'text', label: 'Role', default: '' } },
    default: [{ name: 'Default Person', role: 'Default Role' }],
  },
} as const;

export default editable;
