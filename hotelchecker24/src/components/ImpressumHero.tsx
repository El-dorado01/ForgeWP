import { ChevronRight, FileText } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta, useWpI18n } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as impressumPageEditable, defaults } from '../../cms/editables/impressum-page';

export const editable = pickEditable(impressumPageEditable, {
    badge: 'hero_badge',
    title: 'hero_title',
  });


export interface ImpressumHeroProps {
  badge?: string;
  title?: string;
  setAttributes?: (attrs: Partial<ImpressumHeroProps>) => void;
}

/**
 * @forgewp-block
 * title: Impressum Hero
 * category: theme
 * icon: media-text
 * description: Impressum page hero with breadcrumb.
 */
export function ImpressumHero({
  badge: badgeProp,
  title: titleProp,
  setAttributes,
}: ImpressumHeroProps) {
  const { __ } = useWpI18n();
  const homeHref = useWpPageLink('front-page', '/');

  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;

  return (
    <div className='relative overflow-hidden bg-slate-50 w-full py-8 sm:py-10'>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0">
          <WpLink
            href={homeHref}
            className="hover:text-primary transition-colors whitespace-nowrap shrink-0"
          >
            {__('Startseite')}
          </WpLink>
          <ChevronRight className="w-4 h-4 shrink-0" />
          <span className="text-slate-700 truncate min-w-0">{__('Impressum')}</span>
        </nav>

        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
            <FileText className="w-3.5 h-3.5" />
            {setAttributes ? (
              <WpEditable
                tagName="span"
                value={badge}
                onChange={(val) => setAttributes({ badge: val })}
              />
            ) : (
              badge
            )}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
            {setAttributes ? (
              <WpEditable
                tagName="span"
                value={title}
                onChange={(val) => setAttributes({ title: val })}
              />
            ) : (
              title
            )}
          </h1>
        </div>
      </div>
    </div>
  );
}

export default ImpressumHero;
