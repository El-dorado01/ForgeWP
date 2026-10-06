import { ArrowRight, Check } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type LicenseInquiryOverviewAttributes = {
  eyebrow?: string;
  heading?: string;
  price?: string;
  scope?: string;
  introduction?: string;
  featureOne?: string;
  featureTwo?: string;
  featureThree?: string;
  otherLicenseLabel?: string;
  otherLicenseHref?: string;
  setAttributes?: (
    attributes: Partial<LicenseInquiryOverviewAttributes>,
  ) => void;
};

function LicenseInquiryOverview({
  eyebrow = 'Lizenzanfrage',
  heading = 'Teamlizenz',
  price = '1.490 €',
  scope = 'Ein Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.',
  introduction = 'Die vollständige Studie für Managementteams, Fachabteilungen, Beratungsunternehmen und kleinere Hotelgruppen.',
  featureOne = 'Nutzungsrecht für bis zu 10 Personen',
  featureTwo = 'Einheitliche Lizenz innerhalb Ihres Unternehmens',
  featureThree = 'Angebot und Abwicklung direkt durch DICON',
  otherLicenseLabel = 'Firmenlizenz ansehen',
  otherLicenseHref = '/lizenz/unternehmen',
  setAttributes,
}: LicenseInquiryOverviewAttributes) {
  const companyLicenseHref = useWpPageLink(
    'unternehmenslizenz-page',
    '/lizenz/unternehmen',
  );
  const resolvedOtherLicenseHref =
    otherLicenseHref === '/lizenz/unternehmen'
      ? companyLicenseHref
      : otherLicenseHref;
  const features = [
    ['featureOne', featureOne],
    ['featureTwo', featureTwo],
    ['featureThree', featureThree],
  ] as const;

  return (
    <section className='border border-brand/15 bg-white p-6 sm:p-8'>
      <div className='flex flex-wrap items-start justify-between gap-4 border-b border-brand/15 pb-6'>
        <div>
          <WpEditable
            tagName='p'
            value={eyebrow}
            onChange={(value) => setAttributes?.({ eyebrow: value })}
            className='text-xs font-bold uppercase tracking-[0.16em] text-accent'
          />
          <WpEditable
            tagName='h2'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='mt-3 font-heading text-2xl font-bold text-brand'
          />
        </div>
        <WpEditable
          tagName='p'
          value={price}
          onChange={(value) => setAttributes?.({ price: value })}
          className='font-heading text-2xl font-bold text-brand'
        />
      </div>
      <WpEditable
        tagName='p'
        value={scope}
        onChange={(value) => setAttributes?.({ scope: value })}
        className='mt-6 text-sm font-semibold leading-relaxed text-brand'
      />
      <WpEditable
        tagName='p'
        value={introduction}
        onChange={(value) => setAttributes?.({ introduction: value })}
        className='mt-3 text-sm leading-relaxed text-slate-600'
      />
      <ul className='mt-6 space-y-3 border-t border-brand/15 pt-6 text-sm leading-relaxed text-slate-600'>
        {features.map(([field, value]) => (
          <li
            key={field}
            className='flex gap-3'
          >
            <Check
              size={17}
              className='mt-0.5 shrink-0 text-accent'
              aria-hidden='true'
            />
            <WpEditable
              tagName='span'
              value={value}
              onChange={(nextValue) => setAttributes?.({ [field]: nextValue })}
            />
          </li>
        ))}
      </ul>
      <WpLink
        href={resolvedOtherLicenseHref}
        className='mt-6 inline-flex items-center gap-2 border-b border-brand pb-2 text-xs font-bold uppercase text-brand transition-colors hover:border-accent hover:text-accent'
      >
        <WpEditable
          tagName='span'
          value={otherLicenseLabel}
          onChange={(value) => setAttributes?.({ otherLicenseLabel: value })}
        />
        <ArrowRight
          size={15}
          aria-hidden='true'
        />
      </WpLink>
    </section>
  );
}

export default defineBlock({
  name: 'license-inquiry-overview',
  title: 'Hospitality License Inquiry Overview',
  category: 'theme',
  icon: 'businessman',
  description: 'Editable license scope, features, and related-license link.',
  attributes: {
    eyebrow: { type: 'string', default: 'Lizenzanfrage' },
    heading: { type: 'string', default: 'Teamlizenz' },
    price: { type: 'string', default: '1.490 €' },
    scope: {
      type: 'string',
      default:
        'Ein Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.',
    },
    introduction: {
      type: 'string',
      default:
        'Die vollständige Studie für Managementteams, Fachabteilungen, Beratungsunternehmen und kleinere Hotelgruppen.',
    },
    featureOne: {
      type: 'string',
      default: 'Nutzungsrecht für bis zu 10 Personen',
    },
    featureTwo: {
      type: 'string',
      default: 'Einheitliche Lizenz innerhalb Ihres Unternehmens',
    },
    featureThree: {
      type: 'string',
      default: 'Angebot und Abwicklung direkt durch DICON',
    },
    otherLicenseLabel: {
      type: 'string',
      default: 'Firmenlizenz ansehen',
    },
    otherLicenseHref: {
      type: 'string',
      default: '/lizenz/unternehmen',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <LicenseInquiryOverview
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LicenseInquiryOverview {...attributes} />,
});
