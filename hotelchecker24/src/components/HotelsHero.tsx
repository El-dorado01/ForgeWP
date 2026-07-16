import { ChevronRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta, useWpI18n } from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as hotelsPageEditable, defaults } from '../../cms/editables/hotels-page';

export const editable = pickEditable(hotelsPageEditable, {
    title: 'hero_title',
    subtitle: 'hero_subtitle',
  });

export interface HotelsHeroProps {
  title?: string;
  subtitle?: string;
  setAttributes?: (attrs: Partial<HotelsHeroProps>) => void;
}

/**
 * @forgewp-block
 * title: Hotels Hero
 * category: theme
 * icon: admin-multisite
 * description: Compact editorial hero for the hotels directory page.
 */
export function HotelsHero({
  title: titleProp,
  subtitle: subtitleProp,
  setAttributes,
}: HotelsHeroProps) {
  const { __ } = useWpI18n();
  const homeHref = useWpPageLink('front-page', '/');

  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);

  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;

  return (
    <div className='relative overflow-hidden bg-slate-50 py-8 px-4 sm:px-6 lg:px-8'>
      <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none' />
      <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none' />

      <div className='relative max-w-7xl mx-auto z-10'>
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0">
          <WpLink
            href={homeHref}
            className="hover:text-primary transition-colors whitespace-nowrap shrink-0"
          >
            {__('Startseite')}
          </WpLink>
          <ChevronRight className="w-4 h-4 shrink-0" />
          <span className="text-slate-700 truncate min-w-0">{__('Hotels')}</span>
        </nav>
        <h1 className='text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2'>
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
            className='text-slate-500 text-sm max-w-2xl'
          />
        ) : (
          <p className='text-slate-500 text-sm max-w-2xl'>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default HotelsHero;
