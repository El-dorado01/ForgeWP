import { ArrowLeft } from 'lucide-react';
import {
  defineBlock,
  useWpPageLink,
  WpEditable,
  WpLink,
} from '@forgewp/react';

type SingleLicenseBackLinkAttributes = {
  label?: string;
  href?: string;
  showIcon?: boolean;
  setAttributes?: (
    attributes: Partial<SingleLicenseBackLinkAttributes>,
  ) => void;
};

function SingleLicenseBackLink({
  label = 'Zur Lizenzübersicht',
  href = '/lizenzen',
  showIcon = true,
  setAttributes,
}: SingleLicenseBackLinkAttributes) {
  const licensesPageHref = useWpPageLink('lizenzen-page', '/lizenzen');
  const resolvedHref = href === '/lizenzen' ? licensesPageHref : href;

  return (
    <WpLink
      href={resolvedHref}
      className='mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-accent'
    >
      {showIcon && (
        <ArrowLeft
          size={15}
          aria-hidden='true'
        />
      )}
      <WpEditable
        tagName='span'
        value={label}
        onChange={(value) => setAttributes?.({ label: value })}
      />
    </WpLink>
  );
}

export default defineBlock({
  name: 'single-license-back-link',
  title: 'Single License Return Link',
  category: 'theme',
  icon: 'undo',
  description: 'Return link to the license overview.',
  attributes: {
    label: {
      type: 'string',
      default: 'Zur Lizenzübersicht',
      label: 'Link text',
    },
    href: {
      type: 'string',
      control: 'url',
      default: '/lizenzen',
      label: 'Link URL',
    },
    showIcon: {
      type: 'boolean',
      control: 'toggle',
      default: true,
      label: 'Show link icon',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <SingleLicenseBackLink {...attributes} setAttributes={setAttributes} />
  ),
  save: ({ attributes }) => <SingleLicenseBackLink {...attributes} />,
});
