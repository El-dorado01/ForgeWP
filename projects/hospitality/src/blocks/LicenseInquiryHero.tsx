import { ArrowLeft } from 'lucide-react';
import {
  defineBlock,
  useWpPageLink,
  WpEditable,
  WpLink,
} from '@forgewp/react';

export type LicenseInquiryHeroProps = {
  eyebrow?: string;
  pageTitle?: string;
  introduction?: string;
  licensesLabel?: string;
  licensesHref?: string;
  showLicensesIcon?: boolean;
  setAttributes?: (
    attributes: Partial<LicenseInquiryHeroProps>,
  ) => void;
};

export function LicenseInquiryHeroContent({
  eyebrow = 'Lizenzanfrage',
  pageTitle = 'Lassen Sie uns Ihren Bedarf besprechen.',
  introduction = 'Wählen Sie den passenden Nutzungsumfang für Ihr Unternehmen und senden Sie uns Ihre Anfrage.',
  licensesLabel = 'Alle Lizenzen',
  licensesHref: licensesHrefProp,
  showLicensesIcon = true,
  setAttributes,
}: LicenseInquiryHeroProps) {
  const resolvedLicensesHref = useWpPageLink('lizenzen-page', '/lizenzen');

  return (
    <div className='mx-auto max-w-[1440px] px-6 py-10 sm:px-8 sm:py-14 lg:px-14 lg:py-16'>
      <WpLink
        href={licensesHrefProp || resolvedLicensesHref}
        className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white'
      >
        {showLicensesIcon && (
          <ArrowLeft
            size={15}
            aria-hidden='true'
          />
        )}
        <WpEditable
          tagName='span'
          value={licensesLabel}
          onChange={(value) => setAttributes?.({ licensesLabel: value })}
        />
      </WpLink>
      <div className='mt-9 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            <WpEditable
              tagName='span'
              value={eyebrow}
              onChange={(value) => setAttributes?.({ eyebrow: value })}
            />
          </p>
          <WpEditable
            tagName='h1'
            value={pageTitle}
            onChange={(value) => setAttributes?.({ pageTitle: value })}
            className='mt-4 max-w-4xl break-words font-heading text-5xl font-black leading-[0.98] hyphens-auto sm:text-6xl lg:text-7xl'
          />
        </div>
        <WpEditable
          tagName='p'
          value={introduction}
          onChange={(value) => setAttributes?.({ introduction: value })}
          className='max-w-xl border-l border-white/20 pl-5 text-base leading-relaxed text-slate-300 sm:pl-7 sm:text-lg'
        />
      </div>
    </div>
  );
}

export default defineBlock({
  name: 'license-inquiry-hero',
  title: 'Hospitality License Inquiry Hero',
  category: 'theme',
  icon: 'cover-image',
  description:
    'Inquiry-page hero with an editable title, introduction, and link to all licenses.',
  attributes: {
    eyebrow: { type: 'string', default: 'Lizenzanfrage' },
    pageTitle: {
      type: 'string',
      default: 'Lassen Sie uns Ihren Bedarf besprechen.',
    },
    introduction: {
      type: 'string',
      default:
        'Wählen Sie den passenden Nutzungsumfang für Ihr Unternehmen und senden Sie uns Ihre Anfrage.',
    },
    licensesLabel: {
      type: 'string',
      default: 'Alle Lizenzen',
      label: 'All licenses link text',
    },
    licensesHref: {
      type: 'string',
      control: 'url',
      default: '',
      label: 'All licenses URL',
    },
    showLicensesIcon: {
      type: 'boolean',
      control: 'toggle',
      label: 'Show link icon',
      default: true,
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <header className='bg-brand text-white'>
      <LicenseInquiryHeroContent
        {...attributes}
        setAttributes={setAttributes}
      />
    </header>
  ),
  save: ({ attributes }) => (
    <header className='bg-brand text-white'>
      <LicenseInquiryHeroContent {...attributes} />
    </header>
  ),
});
