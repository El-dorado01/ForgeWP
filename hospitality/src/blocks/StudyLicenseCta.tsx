import { ArrowRight } from 'lucide-react';
import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type StudyLicenseCtaAttributes = {
  eyebrow?: string;
  heading?: string;
  label?: string;
  href?: string;
  showActionIcon?: boolean;
  setAttributes?: (attributes: Partial<StudyLicenseCtaAttributes>) => void;
};

function StudyLicenseCta({
  eyebrow = 'Weiter zur Lizenz',
  heading = 'Die vollständige Studie lesen.',
  label = 'Lizenzmodelle ansehen',
  href = '/lizenzen',
  showActionIcon = false,
  setAttributes,
}: StudyLicenseCtaAttributes) {
  const licensesPageHref = useWpPageLink('lizenzen-page', '/lizenzen');
  const resolvedHref = href === '/lizenzen' ? licensesPageHref : href;

  return (
    <section className='border-t border-slate-200 bg-accent px-5 py-16 text-white sm:px-8 lg:px-12'>
      <div className='mx-auto flex max-w-360 flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <WpEditable
            tagName='p'
            value={eyebrow}
            onChange={(value) => setAttributes?.({ eyebrow: value })}
            className='text-[10px] font-bold uppercase tracking-[0.18em] text-white/70'
          />
          <WpEditable
            tagName='h2'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='mt-3 font-heading text-4xl font-black tracking-[-0.06em] sm:text-6xl'
          />
        </div>
        <WpLink
          href={resolvedHref}
          className='inline-flex items-center justify-center gap-3 border border-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-accent'
        >
          <WpEditable
            tagName='span'
            value={label}
            onChange={(value) => setAttributes?.({ label: value })}
          />
          {showActionIcon && (
            <ArrowRight
              size={16}
              aria-hidden='true'
            />
          )}
        </WpLink>
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'study-license-cta',
  title: 'Hospitality Study License CTA',
  category: 'theme',
  icon: 'arrow-right-alt',
  description: 'Editable call to action linking the study to its licenses.',
  attributes: {
    eyebrow: { type: 'string', default: 'Weiter zur Lizenz' },
    heading: { type: 'string', default: 'Die vollständige Studie lesen.' },
    label: { type: 'string', default: 'Lizenzmodelle ansehen' },
    href: {
      type: 'string',
      control: 'url',
      label: 'Action URL',
      default: '/lizenzen',
    },
    showActionIcon: {
      type: 'boolean',
      control: 'toggle',
      label: 'Show action icon',
      default: false,
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <StudyLicenseCta
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <StudyLicenseCta {...attributes} />,
});
