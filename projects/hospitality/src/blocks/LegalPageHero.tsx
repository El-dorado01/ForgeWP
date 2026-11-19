import { defineBlock, WpEditable } from '@forgewp/react';

type LegalPageHeroAttributes = {
  eyebrow?: string;
  heading?: string;
  notice?: string;
  setAttributes?: (attributes: Partial<LegalPageHeroAttributes>) => void;
};

function LegalPageHero({
  eyebrow = 'Hospitality 2035 / Rechtliches',
  heading = 'Seitentitel',
  notice = '',
  setAttributes,
}: LegalPageHeroAttributes) {
  return (
    <header className='bg-brand text-white'>
      <div className='mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
        <WpEditable
          tagName='p'
          value={eyebrow}
          onChange={(value) => setAttributes?.({ eyebrow: value })}
          className='text-xs font-bold uppercase tracking-[0.18em] text-accent'
        />
        <WpEditable
          tagName='h1'
          value={heading}
          onChange={(value) => setAttributes?.({ heading: value })}
          className='mt-6 max-w-4xl wrap-break-word font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'
        />
        <WpEditable
          tagName='p'
          value={notice}
          onChange={(value) => setAttributes?.({ notice: value })}
          className='mt-6 max-w-3xl border-l-2 border-accent pl-4 text-sm leading-relaxed text-slate-300'
        />
      </div>
    </header>
  );
}

export default defineBlock({
  name: 'legal-page-hero',
  title: 'Hospitality Legal Page Hero',
  category: 'theme',
  icon: 'cover-image',
  description: 'Reusable editable heading and notice for legal pages.',
  attributes: {
    eyebrow: { type: 'string', default: 'Hospitality 2035 / Rechtliches' },
    heading: { type: 'string', default: 'Seitentitel' },
    notice: { type: 'string', default: '' },
  },
  edit: ({ attributes, setAttributes }) => (
    <LegalPageHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LegalPageHero {...attributes} />,
});
