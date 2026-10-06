import { ArrowLeft } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type SingleLicenseHeroAttributes = {
  brandName?: string;
  pageLabel?: string;
  heading?: string;
  mobileHeadingFirst?: string;
  mobileHeadingSecond?: string;
  description?: string;
  backLabel?: string;
  setAttributes?: (attributes: Partial<SingleLicenseHeroAttributes>) => void;
};

function SingleLicenseHero({
  brandName = 'Hospitality 2035',
  pageLabel = 'Einzellizenz',
  heading = 'Bestellübersicht',
  mobileHeadingFirst = 'Bestell-',
  mobileHeadingSecond = 'übersicht',
  description = 'Für Unternehmen und gewerbliche Nutzer. Prüfen Sie Lizenzumfang und Preis; Rechnungs- und Zahlungsdaten erfassen Sie im EDD-Checkout.',
  backLabel = 'Alle Lizenzen',
  setAttributes,
}: SingleLicenseHeroAttributes) {
  const licensesHref = useWpPageLink('lizenzen-page', '/lizenzen');

  return (
    <header className='bg-brand text-white'>
      <div className='mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12'>
        <WpLink
          href={licensesHref}
          className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300 transition-colors hover:text-white'
        >
          <ArrowLeft
            size={15}
            aria-hidden='true'
          />
          <WpEditable
            tagName='span'
            value={backLabel}
            onChange={(value) => setAttributes?.({ backLabel: value })}
          />
        </WpLink>
        <p className='mt-9 text-xs font-bold uppercase tracking-[0.18em] text-accent'>
          <WpEditable
            tagName='span'
            value={brandName}
            onChange={(value) => setAttributes?.({ brandName: value })}
          />
          <span className='px-2 text-white/40'>/</span>
          <WpEditable
            tagName='span'
            value={pageLabel}
            onChange={(value) => setAttributes?.({ pageLabel: value })}
          />
        </p>
        <h1 className='mt-4 wrap-break-word font-heading text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl'>
          <WpEditable
            tagName='span'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='hidden sm:inline'
          />
          <span className='sm:hidden'>
            <WpEditable
              tagName='span'
              value={mobileHeadingFirst}
              onChange={(value) =>
                setAttributes?.({ mobileHeadingFirst: value })
              }
            />
            <br />
            <WpEditable
              tagName='span'
              value={mobileHeadingSecond}
              onChange={(value) =>
                setAttributes?.({ mobileHeadingSecond: value })
              }
            />
          </span>
        </h1>
        <WpEditable
          tagName='p'
          value={description}
          onChange={(value) => setAttributes?.({ description: value })}
          className='mt-4 max-w-2xl text-base leading-relaxed text-slate-300'
        />
      </div>
    </header>
  );
}

export default defineBlock({
  name: 'single-license-hero',
  title: 'Single License Hero',
  category: 'theme',
  icon: 'cover-image',
  description: 'Editable introduction for a single-license purchase page.',
  attributes: {
    brandName: { type: 'string', default: 'Hospitality 2035' },
    pageLabel: { type: 'string', default: 'Einzellizenz' },
    heading: { type: 'string', default: 'Bestellübersicht' },
    mobileHeadingFirst: { type: 'string', default: 'Bestell-' },
    mobileHeadingSecond: { type: 'string', default: 'übersicht' },
    description: {
      type: 'string',
      default:
        'Für Unternehmen und gewerbliche Nutzer. Prüfen Sie Lizenzumfang und Preis; Rechnungs- und Zahlungsdaten erfassen Sie im EDD-Checkout.',
    },
    backLabel: { type: 'string', default: 'Alle Lizenzen' },
  },
  edit: ({ attributes, setAttributes }) => (
    <SingleLicenseHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <SingleLicenseHero {...attributes} />,
});
