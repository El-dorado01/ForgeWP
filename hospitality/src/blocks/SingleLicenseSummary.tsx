import { defineBlock, WpEditable, WpImage } from '@forgewp/react';

type SingleLicenseSummaryAttributes = {
  eyebrow?: string;
  title?: string;
  cover?: string;
  coverAlt?: string;
  scope?: string;
  format?: string;
  setAttributes?: (attributes: Partial<SingleLicenseSummaryAttributes>) => void;
};

function SingleLicenseSummary({
  eyebrow = 'Ihre Bestellung',
  title = 'Hospitality 2035',
  cover = '/assets/hospitality-cover.png',
  coverAlt = 'Cover der Studie Hospitality 2035',
  scope = 'Einzellizenz · ein Nutzer',
  format = 'Digitale Studie (PDF)',
  setAttributes,
}: SingleLicenseSummaryAttributes) {
  return (
    <div>
      <WpEditable
        tagName='p'
        value={eyebrow}
        onChange={(value) => setAttributes?.({ eyebrow: value })}
        className='text-xs font-bold uppercase tracking-[0.16em] text-accent'
      />
      <div className='mt-5 flex gap-4 border-b border-brand/15 pb-5'>
        <WpImage
          src={cover}
          alt={coverAlt}
          className='h-28 w-20 shrink-0 object-cover object-top'
        />
        <div className='min-w-0'>
          <WpEditable
            tagName='h2'
            value={title}
            onChange={(value) => setAttributes?.({ title: value })}
            className='font-heading text-lg font-bold leading-snug text-brand'
          />
          <WpEditable
            tagName='p'
            value={scope}
            onChange={(value) => setAttributes?.({ scope: value })}
            className='mt-2 text-sm leading-relaxed text-slate-600'
          />
          <WpEditable
            tagName='p'
            value={format}
            onChange={(value) => setAttributes?.({ format: value })}
            className='mt-2 text-xs text-slate-500'
          />
        </div>
      </div>
    </div>
  );
}

export default defineBlock({
  name: 'single-license-summary',
  title: 'Single License Summary',
  category: 'theme',
  icon: 'media-document',
  description: 'Editable product summary to pair with an EDD Buy Button.',
  attributes: {
    eyebrow: { type: 'string', default: 'Ihre Bestellung' },
    title: { type: 'string', default: 'Hospitality 2035' },
    cover: { type: 'string', default: '/assets/hospitality-cover.png' },
    coverAlt: {
      type: 'string',
      default: 'Cover der Studie Hospitality 2035',
    },
    scope: { type: 'string', default: 'Einzellizenz · ein Nutzer' },
    format: { type: 'string', default: 'Digitale Studie (PDF)' },
  },
  edit: ({ attributes, setAttributes }) => (
    <SingleLicenseSummary
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <SingleLicenseSummary {...attributes} />,
});
