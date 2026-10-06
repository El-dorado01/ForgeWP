import { ArrowRight, Check } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type LicensePlanCardAttributes = {
  eyebrow?: string;
  title?: string;
  price?: string;
  priceNote?: string;
  featureOne?: string;
  featureTwo?: string;
  actionLabel?: string;
  actionHref?: string;
  featured?: boolean;
  setAttributes?: (attributes: Partial<LicensePlanCardAttributes>) => void;
};

function LicensePlanCard({
  eyebrow = 'Für eine Person',
  title = 'Einzellizenz',
  price = '249 €',
  priceNote = 'netto zzgl. MwSt.',
  featureOne = 'Nutzungsrecht für einen persönlichen Nutzer',
  featureTwo = 'Für einzelne Entscheider und Fachverantwortliche',
  actionLabel = 'Lizenz auswählen',
  actionHref = '/checkout/single-license',
  featured = false,
  setAttributes,
}: LicensePlanCardAttributes) {
  const singleLicenseHref = useWpPageLink(
    'einzellizenz-page',
    '/checkout/single-license',
  );
  const teamLicenseHref = useWpPageLink('teamlizenz-page', '/lizenz/team');
  const companyLicenseHref = useWpPageLink(
    'unternehmenslizenz-page',
    '/lizenz/unternehmen',
  );
  const resolvedActionHref =
    actionHref === '/checkout/single-license'
      ? singleLicenseHref
      : actionHref === '/lizenz/team'
        ? teamLicenseHref
        : actionHref === '/lizenz/unternehmen'
          ? companyLicenseHref
          : actionHref;
  const surfaceClass = featured ? 'bg-brand text-white' : 'bg-white text-brand';
  const mutedClass = featured ? 'text-slate-300' : 'text-slate-500';
  const featureClass = featured
    ? 'border-white/20 text-slate-300'
    : 'border-brand/15 text-slate-600';

  return (
    <article
      className={`flex min-h-97.5 flex-col border border-brand/15 p-6 sm:p-8 ${surfaceClass}`}
    >
      <WpEditable
        tagName='p'
        value={eyebrow}
        onChange={(value) => setAttributes?.({ eyebrow: value })}
        className='text-xs font-bold uppercase tracking-[0.16em] text-accent'
      />
      <WpEditable
        tagName='h2'
        value={title}
        onChange={(value) => setAttributes?.({ title: value })}
        className='mt-5 font-heading text-2xl font-bold'
      />
      <WpEditable
        tagName='p'
        value={price}
        onChange={(value) => setAttributes?.({ price: value })}
        className='mt-6 font-heading text-4xl font-bold'
      />
      <WpEditable
        tagName='p'
        value={priceNote}
        onChange={(value) => setAttributes?.({ priceNote: value })}
        className={`mt-1 text-sm ${mutedClass}`}
      />
      <ul
        className={`mt-7 space-y-3 border-t pt-6 text-sm leading-relaxed ${featureClass}`}
      >
        {[
          ['featureOne', featureOne],
          ['featureTwo', featureTwo],
        ].map(([field, value]) => (
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
        href={resolvedActionHref}
        className={`mt-auto inline-flex items-center justify-between gap-3 border px-4 py-3.5 text-xs font-bold uppercase ${featured ? 'border-accent bg-accent text-white hover:bg-transparent' : 'border-brand text-brand hover:bg-brand hover:text-white'}`}
      >
        <WpEditable
          tagName='span'
          value={actionLabel}
          onChange={(value) => setAttributes?.({ actionLabel: value })}
        />
        <ArrowRight
          size={16}
          aria-hidden='true'
        />
      </WpLink>
    </article>
  );
}

export default defineBlock({
  name: 'license-plan-card',
  title: 'Hospitality License Plan Card',
  category: 'theme',
  icon: 'index-card',
  description: 'Reusable, editable license offer card.',
  attributes: {
    eyebrow: { type: 'string', default: 'Für eine Person' },
    title: { type: 'string', default: 'Einzellizenz' },
    price: { type: 'string', default: '249 €' },
    priceNote: { type: 'string', default: 'netto zzgl. MwSt.' },
    featureOne: {
      type: 'string',
      default: 'Nutzungsrecht für einen persönlichen Nutzer',
    },
    featureTwo: {
      type: 'string',
      default: 'Für einzelne Entscheider und Fachverantwortliche',
    },
    actionLabel: { type: 'string', default: 'Lizenz auswählen' },
    actionHref: { type: 'string', default: '/checkout/single-license' },
    featured: { type: 'boolean', default: false },
  },
  edit: ({ attributes, setAttributes }) => (
    <LicensePlanCard
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LicensePlanCard {...attributes} />,
});
