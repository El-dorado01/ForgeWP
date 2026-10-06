import { defineBlock, WpEditable } from '@forgewp/react';

type LicenseOptionsIntroAttributes = {
  eyebrow?: string;
  heading?: string;
  note?: string;
  setAttributes?: (attributes: Partial<LicenseOptionsIntroAttributes>) => void;
};

function LicenseOptionsIntro({
  eyebrow = 'Preisübersicht',
  heading = 'Drei Nutzungsumfänge',
  note = 'Alle Preise verstehen sich netto zzgl. der gesetzlichen Umsatzsteuer.',
  setAttributes,
}: LicenseOptionsIntroAttributes) {
  return (
    <section className='mx-auto max-w-360 px-6 py-10 sm:px-8 lg:px-14'>
      <div className='flex flex-col justify-between gap-4 border-b border-brand/20 pb-6 sm:flex-row sm:items-end'>
        <div>
          <WpEditable
            tagName='p'
            value={eyebrow}
            onChange={(value) => setAttributes?.({ eyebrow: value })}
            className='text-xs font-bold uppercase tracking-[0.18em] text-accent'
          />
          <WpEditable
            tagName='h2'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='mt-3 font-heading text-3xl font-bold sm:text-4xl'
          />
        </div>
        <WpEditable
          tagName='p'
          value={note}
          onChange={(value) => setAttributes?.({ note: value })}
          className='max-w-md text-sm leading-relaxed text-slate-600'
        />
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'license-options-intro',
  title: 'Hospitality License Options Intro',
  category: 'theme',
  icon: 'heading',
  description: 'Editable heading and note for a license comparison.',
  attributes: {
    eyebrow: { type: 'string', default: 'Preisübersicht' },
    heading: { type: 'string', default: 'Drei Nutzungsumfänge' },
    note: {
      type: 'string',
      default:
        'Alle Preise verstehen sich netto zzgl. der gesetzlichen Umsatzsteuer.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <LicenseOptionsIntro
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LicenseOptionsIntro {...attributes} />,
});
