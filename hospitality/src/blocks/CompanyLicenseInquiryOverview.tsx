import { ArrowRight, Check } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type CompanyOverviewFields = {
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

type CompanyOverviewAttributes = CompanyOverviewFields & {
  showLinkIcon?: boolean;
  setAttributes?: (attributes: Partial<CompanyOverviewFields>) => void;
};

function CompanyLicenseInquiryOverview({
  eyebrow = 'Lizenz im Überblick',
  heading = 'Unternehmenslizenz',
  price = 'ab 2.490 €',
  priceNote = 'netto zzgl. gesetzlicher MwSt.',
  scope = 'Für größere Teams, Hotelgruppen und Unternehmen. Umfang und Preis werden passend zur geplanten Nutzung vereinbart.',
  featureOne = 'Individuell abgestimmter Nutzerkreis',
  featureTwo = 'Geeignet für Hotelgruppen und mehrere Standorte',
  featureThree = 'Angebot und Abwicklung direkt durch DICON',
  otherLicenseLabel = 'Teamlizenz ansehen',
  otherLicenseHref = '/lizenz/team',
  showLinkIcon = true,
  setAttributes,
}: CompanyOverviewAttributes) {
  const teamLicenseHref = useWpPageLink('teamlizenz-page', '/lizenz/team');
  const resolvedOtherLicenseHref =
    otherLicenseHref === '/lizenz/team' ? teamLicenseHref : otherLicenseHref;

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
  name: 'company-license-inquiry-overview',
  title: 'Hospitality Company License Inquiry Overview',
  category: 'theme',
  icon: 'businessman',
  description:
    'Editable company-license scope, features, and related-license link.',
  attributes: {
    eyebrow: { type: 'string', default: 'Lizenz im Überblick' },
    heading: { type: 'string', default: 'Unternehmenslizenz' },
    price: { type: 'string', default: 'ab 2.490 €' },
    priceNote: {
      type: 'string',
      default: 'netto zzgl. gesetzlicher MwSt.',
    },
    scope: {
      type: 'string',
      default:
        'Für größere Teams, Hotelgruppen und Unternehmen. Umfang und Preis werden passend zur geplanten Nutzung vereinbart.',
    },
    featureOne: {
      type: 'string',
      default: 'Individuell abgestimmter Nutzerkreis',
    },
    featureTwo: {
      type: 'string',
      default: 'Geeignet für Hotelgruppen und mehrere Standorte',
    },
    featureThree: {
      type: 'string',
      default: 'Angebot und Abwicklung direkt durch DICON',
    },
    otherLicenseLabel: {
      type: 'string',
      default: 'Teamlizenz ansehen',
    },
    otherLicenseHref: {
      type: 'string',
      control: 'url',
      default: '/lizenz/team',
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
    <CompanyLicenseInquiryOverview
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <CompanyLicenseInquiryOverview {...attributes} />,
});
