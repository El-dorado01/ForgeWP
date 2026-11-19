import { defineBlock, WpEditable } from '@forgewp/react';

type LicensePageHeroAttributes = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  notice?: string;
  setAttributes?: (attributes: Partial<LicensePageHeroAttributes>) => void;
};

function LicensePageHero({
  eyebrow = 'Hospitality 2035 / Lizenzmodelle',
  heading = 'Die passende Lizenz für Ihr Unternehmen.',
  description = 'Die vollständige Studie zur wirtschaftlichen Zukunft der Hotellerie. Wählen Sie den Nutzungsumfang passend zu Ihrem Team.',
  notice = 'Ausschließlich für Unternehmen und gewerbliche Nutzer',
  setAttributes,
}: LicensePageHeroAttributes) {
  return (
    <header className='bg-brand text-white'>
      <div className='mx-auto grid min-w-0 max-w-360 grid-cols-1 gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-14 lg:py-24'>
        <div>
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
            className='mt-8 max-w-4xl wrap-break-word font-heading text-5xl font-black leading-[0.98] hyphens-auto sm:text-6xl lg:text-7xl'
          />
        </div>
        <div className='border-l border-white/20 pl-5 sm:pl-7'>
          <WpEditable
            tagName='p'
            value={description}
            onChange={(value) => setAttributes?.({ description: value })}
            className='text-base leading-relaxed text-slate-300 sm:text-lg'
          />
          <WpEditable
            tagName='p'
            value={notice}
            onChange={(value) => setAttributes?.({ notice: value })}
            className='mt-5 text-xs font-bold uppercase text-accent'
          />
        </div>
      </div>
    </header>
  );
}

export default defineBlock({
  name: 'license-page-hero',
  title: 'Hospitality License Hero',
  category: 'theme',
  icon: 'cover-image',
  description: 'Editable introduction for Hospitality license pages.',
  attributes: {
    eyebrow: { type: 'string', default: 'Hospitality 2035 / Lizenzmodelle' },
    heading: {
      type: 'string',
      default: 'Die passende Lizenz für Ihr Unternehmen.',
    },
    description: {
      type: 'string',
      default:
        'Die vollständige Studie zur wirtschaftlichen Zukunft der Hotellerie. Wählen Sie den Nutzungsumfang passend zu Ihrem Team.',
    },
    notice: {
      type: 'string',
      default: 'Ausschließlich für Unternehmen und gewerbliche Nutzer',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <LicensePageHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LicensePageHero {...attributes} />,
});
