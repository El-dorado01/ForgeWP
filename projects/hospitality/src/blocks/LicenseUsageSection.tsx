import { ArrowRight } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type LicenseUsageSectionAttributes = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  showActionIcon?: boolean;
  setAttributes?: (attributes: Partial<LicenseUsageSectionAttributes>) => void;
};

function LicenseUsageSection({
  eyebrow = 'Nutzung',
  heading = 'Für Ihr Unternehmen',
  description = 'Die passende Lizenz richtet sich danach, wie viele Personen die Studie innerhalb Ihres Unternehmens nutzen. Nutzungsrechte und Lizenzbedingungen gelten gemäß den vereinbarten Konditionen.',
  actionLabel = 'AGB & Lizenzbedingungen',
  actionHref = '/agb-lizenzbedingungen',
  showActionIcon = true,
  setAttributes,
}: LicenseUsageSectionAttributes) {
  const termsPageHref = useWpPageLink(
    'agb-lizenzbedingungen-page',
    '/agb-lizenzbedingungen',
  );
  const resolvedHref =
    actionHref === '/agb-lizenzbedingungen' ? termsPageHref : actionHref;

  return (
    <section className='border-y border-brand/15 bg-white'>
      <div className='mx-auto grid max-w-360 gap-8 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:px-14'>
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
            className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
          />
        </div>
        <div className='max-w-3xl'>
          <WpEditable
            tagName='p'
            value={description}
            onChange={(value) => setAttributes?.({ description: value })}
            className='text-base leading-relaxed text-slate-600'
          />
          <WpLink
            href={resolvedHref}
            className='mt-5 inline-flex items-center gap-2 border-b border-brand pb-1 text-xs font-bold uppercase text-brand hover:border-accent hover:text-accent'
          >
            <WpEditable
              tagName='span'
              value={actionLabel}
              onChange={(value) => setAttributes?.({ actionLabel: value })}
            />
            {showActionIcon && (
              <ArrowRight
                size={15}
                aria-hidden='true'
              />
            )}
          </WpLink>
        </div>
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'license-usage-section',
  title: 'Hospitality License Usage',
  category: 'theme',
  icon: 'businessman',
  description: 'Editable license usage information and terms link.',
  attributes: {
    eyebrow: { type: 'string', default: 'Nutzung' },
    heading: { type: 'string', default: 'Für Ihr Unternehmen' },
    description: {
      type: 'string',
      default:
        'Die passende Lizenz richtet sich danach, wie viele Personen die Studie innerhalb Ihres Unternehmens nutzen. Nutzungsrechte und Lizenzbedingungen gelten gemäß den vereinbarten Konditionen.',
    },
    actionLabel: { type: 'string', default: 'AGB & Lizenzbedingungen' },
    actionHref: {
      type: 'string',
      control: 'url',
      label: 'Terms URL',
      default: '/agb-lizenzbedingungen',
    },
    showActionIcon: {
      type: 'boolean',
      control: 'toggle',
      label: 'Show action icon',
      default: true,
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <LicenseUsageSection
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LicenseUsageSection {...attributes} />,
});
