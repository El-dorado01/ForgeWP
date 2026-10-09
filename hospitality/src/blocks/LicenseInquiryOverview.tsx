import { ArrowRight, Check } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type LicenseInquiryOverviewFields = {
  eyebrow?: string;
  heading?: string;
  price?: string;
  priceNote?: string;
  scope?: string;
  featureOne?: string;
  featureTwo?: string;
  featureThree?: string;
  otherLicenseLabel?: string;
  otherLicenseHref?: string;
};

type LicenseInquiryOverviewAttributes = LicenseInquiryOverviewFields & {
  showLinkIcon?: boolean;
  setAttributes?: (attributes: Partial<LicenseInquiryOverviewFields>) => void;
};

function LicenseInquiryOverview({
  eyebrow = 'Lizenz im Überblick',
  heading = 'Teamlizenz',
  price = '1.490 €',
  priceNote = 'netto zzgl. gesetzlicher MwSt.',
  scope = 'Ein Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.',
  featureOne = 'Nutzungsrecht für bis zu 10 Personen',
  featureTwo = 'Einheitliche Lizenz innerhalb Ihres Unternehmens',
  featureThree = 'Angebot und Abwicklung direkt durch DICON',
  otherLicenseLabel = 'Firmenlizenz ansehen',
  otherLicenseHref = '/lizenz/unternehmen',
  showLinkIcon = true,
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

  return (
    <aside className='h-fit border-l-2 border-accent pl-6 lg:sticky lg:top-28'>
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
        className='mt-4 font-heading text-2xl font-bold text-brand'
      />
      <WpEditable
        tagName='p'
        value={price}
        onChange={(value) => setAttributes?.({ price: value })}
        className='mt-5 font-heading text-3xl font-bold text-brand'
      />
      <WpEditable
        tagName='p'
        value={priceNote}
        onChange={(value) => setAttributes?.({ priceNote: value })}
        className='mt-1 text-sm text-slate-500'
      />
      <WpEditable
        tagName='p'
        value={scope}
        onChange={(value) => setAttributes?.({ scope: value })}
        className='mt-5 border-t border-brand/15 pt-5 text-sm leading-relaxed text-slate-600'
      />
      <ul className='mt-6 space-y-3'>
        <li className='flex gap-3 text-sm leading-relaxed text-slate-600'>
          <Check
            size={17}
            className='mt-0.5 shrink-0 text-accent'
            aria-hidden='true'
          />
          <WpEditable
            tagName='span'
            value={featureOne}
            onChange={(value) => setAttributes?.({ featureOne: value })}
          />
        </li>
        <li className='flex gap-3 text-sm leading-relaxed text-slate-600'>
          <Check
            size={17}
            className='mt-0.5 shrink-0 text-accent'
            aria-hidden='true'
          />
          <WpEditable
            tagName='span'
            value={featureTwo}
            onChange={(value) => setAttributes?.({ featureTwo: value })}
          />
        </li>
        <li className='flex gap-3 text-sm leading-relaxed text-slate-600'>
          <Check
            size={17}
            className='mt-0.5 shrink-0 text-accent'
            aria-hidden='true'
          />
          <WpEditable
            tagName='span'
            value={featureThree}
            onChange={(value) => setAttributes?.({ featureThree: value })}
          />
        </li>
      </ul>
      <WpLink
        href={resolvedOtherLicenseHref}
        className='mt-8 inline-flex items-center gap-2 border-b border-brand pb-1 text-xs font-bold uppercase tracking-[0.08em] text-brand transition-colors hover:border-accent hover:text-accent'
      >
        <WpEditable
          tagName='span'
          value={otherLicenseLabel}
          onChange={(value) =>
            setAttributes?.({ otherLicenseLabel: value })
          }
        />
        {showLinkIcon && (
          <ArrowRight
            size={14}
            aria-hidden='true'
          />
        )}
      </WpLink>
    </aside>
  );
}

export default defineBlock({
  name: 'license-inquiry-overview',
  title: 'Hospitality License Inquiry Overview',
  category: 'theme',
  icon: 'businessman',
  description: 'Editable license scope, features, and related-license link.',
  attributes: {
    eyebrow: { type: 'string', default: 'Lizenz im Überblick' },
    heading: { type: 'string', default: 'Teamlizenz' },
    price: { type: 'string', default: '1.490 €' },
    priceNote: {
      type: 'string',
      default: 'netto zzgl. gesetzlicher MwSt.',
    },
    scope: {
      type: 'string',
      default:
        'Ein Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.',
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
      control: 'url',
      default: '/lizenz/unternehmen',
      label: 'Other license URL',
    },
    showLinkIcon: {
      type: 'boolean',
      control: 'toggle',
      label: 'Show link icon',
      default: true,
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
