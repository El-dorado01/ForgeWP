import { defineBlock, WpEditable } from '@forgewp/react';

type EddSystemPageHeroAttributes = {
  eyebrow?: string;
  heading?: string;
  introduction?: string;
  setAttributes?: (attributes: Partial<EddSystemPageHeroAttributes>) => void;
};

function EddSystemPageHero({
  eyebrow = 'Hospitality 2035 / Kundenbereich',
  heading = 'Bestellübersicht',
  introduction = 'Die Bestellinformationen und verfügbaren Aktionen werden von Easy Digital Downloads bereitgestellt.',
  setAttributes,
}: EddSystemPageHeroAttributes) {
  return (
    <header className='bg-brand text-white'>
      <div className='mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12'>
        <WpEditable
          tagName='p'
          value={eyebrow}
          onChange={(value) => setAttributes?.({ eyebrow: value })}
          className='text-xs font-bold uppercase tracking-[0.16em] text-accent'
        />
        <WpEditable
          tagName='h1'
          value={heading}
          onChange={(value) => setAttributes?.({ heading: value })}
          className='mt-4 wrap-break-word font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'
        />
        <WpEditable
          tagName='p'
          value={introduction}
          onChange={(value) => setAttributes?.({ introduction: value })}
          className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base'
        />
      </div>
    </header>
  );
}

export default defineBlock({
  name: 'edd-system-page-hero',
  title: 'Hospitality EDD Page Header',
  category: 'theme',
  icon: 'cover-image',
  description:
    'Reusable header for EDD checkout, account, receipt, and transaction pages.',
  attributes: {
    eyebrow: { type: 'string', default: 'Hospitality 2035 / Kundenbereich' },
    heading: { type: 'string', default: 'Bestellübersicht' },
    introduction: {
      type: 'string',
      default:
        'Die Bestellinformationen und verfügbaren Aktionen werden von Easy Digital Downloads bereitgestellt.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <EddSystemPageHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <EddSystemPageHero {...attributes} />,
});
