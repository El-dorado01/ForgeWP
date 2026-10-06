import { ArrowLeft } from 'lucide-react';
import { defineBlock, useWpPageLink, WpLink } from '@forgewp/react';

function SingleLicenseBackLink() {
  const licensesHref = useWpPageLink('lizenzen-page', '/lizenzen');

  return (
    <WpLink
      href={licensesHref}
      className='mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-accent'
    >
      <ArrowLeft
        size={15}
        aria-hidden='true'
      />
      Zur Lizenzübersicht
    </WpLink>
  );
}

export default defineBlock({
  name: 'single-license-back-link',
  title: 'Single License Return Link',
  category: 'theme',
  icon: 'undo',
  description: 'Return link to the license overview.',
  edit: () => <SingleLicenseBackLink />,
  save: () => <SingleLicenseBackLink />,
});
