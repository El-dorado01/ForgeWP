import { Newspaper, ChevronRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta, useWpI18n } from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as listiclesPageEditable, defaults } from '../../cms/editables/listicles-page';

export const editable = pickEditable(listiclesPageEditable, {
    badge: 'hero_badge',
    title: 'hero_title',
    subtitle: 'hero_subtitle',
  });

export interface ListiclesHeroProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  setAttributes?: (attrs: Partial<ListiclesHeroProps>) => void;
}

/**
 * @forgewp-block
 * title: Listicles Hero
 * category: theme
 * icon: welcome-write-blog
 * description: Compact editorial hero for the listicles (Hotelvergleiche) directory page.
 */
export function ListiclesHero({
  badge: badgeProp,
  title: titleProp,
  subtitle: subtitleProp,
  setAttributes,
}: ListiclesHeroProps) {
  const { __ } = useWpI18n();
  const homeHref = useWpPageLink('front-page', '/');

  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;

  return (
    <div className="relative overflow-hidden bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto z-10">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0">
          <WpLink href={homeHref} className="hover:text-primary transition-colors whitespace-nowrap shrink-0">{__('Startseite')}</WpLink>
          <ChevronRight className="w-4 h-4 shrink-0" />
          <span className="text-slate-700 truncate min-w-0">{__('Hotelvergleiche')}</span>
        </nav>
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
              <Newspaper className="w-3.5 h-3.5" />
              {setAttributes ? (
                <WpEditable tagName='span' value={badge} onChange={(val) => setAttributes({ badge: val })} />
              ) : (
                badge
              )}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
              {setAttributes ? (
                <WpEditable tagName='span' value={title} onChange={(val) => setAttributes({ title: val })} />
              ) : (
                title
              )}
            </h1>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={subtitle}
                onChange={(val) => setAttributes({ subtitle: val })}
                className="text-slate-500 text-sm max-w-xl"
              />
            ) : (
              <p className="text-slate-500 text-sm max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListiclesHero;
