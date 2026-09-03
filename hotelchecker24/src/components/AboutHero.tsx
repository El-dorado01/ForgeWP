import { ChevronRight, Star, ArrowRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';


/** Page ACF fields. paddingY/paddingX ship on every block automatically. */
export const editable = pickEditable(berUnsPageEditable, {
    badge: 'hero_badge',
    title: 'hero_title',
    subtitle: 'hero_subtitle',
    image1: 'hero_image_1',
    image2: 'hero_image_2',
    primaryButtonLabel: 'hero_primary_label',
    secondaryButtonLabel: 'hero_secondary_label',
  });


export interface AboutHeroProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  image1?: string;
  image2?: string;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  setAttributes?: (attrs: Partial<AboutHeroProps>) => void;
}

/**
 * @forgewp-block
 * title: About Hero
 * category: theme
 * icon: format-image
 * description: Compact editorial hero with a photo stack (About page section).
 */
export function AboutHero({
  badge: badgeProp,
  title: titleProp,
  subtitle: subtitleProp,
  image1: image1Prop,
  image2: image2Prop,
  primaryButtonLabel: primaryProp,
  secondaryButtonLabel: secondaryProp,
  setAttributes,
}: AboutHeroProps) {
  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const image1Meta = useWpMeta('hero_image_1', defaults.hero_image_1);
  const image2Meta = useWpMeta('hero_image_2', defaults.hero_image_2);
  const primaryMeta = useWpMeta('hero_primary_label', defaults.hero_primary_label);
  const secondaryMeta = useWpMeta('hero_secondary_label', defaults.hero_secondary_label);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const primaryButtonLabel = primaryProp ?? primaryMeta;
  const secondaryButtonLabel = secondaryProp ?? secondaryMeta;
  const img1 = (image1Prop && (image1Prop as any).url) || image1Prop || image1Meta || '';
  const img2 = (image2Prop && (image2Prop as any).url) || image2Prop || image2Meta || '';
  const homeHref = useWpPageLink('front-page', '/');
  const contactHref = useWpPageLink('kontakt-page', '/contact');
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');

  return (
    <div className='relative overflow-hidden bg-slate-50 w-full py-8 sm:py-10'>
      <div className='absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none' />
      <div className='absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none' />

      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10'>
        <nav className='flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0'>
          <WpLink href={homeHref} className='hover:text-primary transition-colors whitespace-nowrap shrink-0'>
            Startseite
          </WpLink>
          <ChevronRight className='w-4 h-4 shrink-0' />
          <span className='text-slate-700 truncate min-w-0'>Über uns</span>
        </nav>

        <div className='grid grid-cols-1 lg:grid-cols-5 gap-10 items-center'>
          <div className='lg:col-span-3 max-w-2xl'>
            <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4'>
              <Star className='w-3.5 h-3.5 fill-primary' />
              {setAttributes ? (
                <WpEditable tagName='span' value={badge} onChange={(val) => setAttributes({ badge: val })} />
              ) : (
                badge
              )}
            </span>
            <h1 className='text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-4 whitespace-pre-line'>
              {setAttributes ? (
                <WpEditable tagName='span' value={title} onChange={(val) => setAttributes({ title: val })} />
              ) : (
                title
              )}
            </h1>
            {setAttributes ? (
              <WpEditable
                tagName='div'
                value={subtitle}
                onChange={(val) => setAttributes({ subtitle: val })}
                className='text-slate-500 text-sm sm:text-base leading-relaxed mb-6'
              />
            ) : (
              <div
                className='text-slate-500 text-sm sm:text-base leading-relaxed mb-6'
                dangerouslySetInnerHTML={{ __html: subtitle }}
              />
            )}
            <div className='flex flex-wrap gap-3'>
              <WpLink
                href={hotelsHref}
                className='relative overflow-hidden inline-flex items-center justify-center bg-primary text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-colors duration-500 group select-none shadow-none cursor-pointer active:scale-95 shrink-0 hover:bg-primary/90'
              >
                <span className='relative z-10 flex items-center gap-2'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={primaryButtonLabel}
                      onChange={(val) => setAttributes({ primaryButtonLabel: val })}
                    />
                  ) : (
                    primaryButtonLabel
                  )}
                  <ArrowRight className='w-4 h-4' />
                </span>
              </WpLink>
              <WpLink
                href={contactHref}
                className='inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0'
              >
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={secondaryButtonLabel}
                    onChange={(val) => setAttributes({ secondaryButtonLabel: val })}
                  />
                ) : (
                  secondaryButtonLabel
                )}
              </WpLink>
            </div>
          </div>

          <div className='lg:col-span-2 relative hidden lg:flex items-center justify-center h-[340px] select-none'>
            <div className='absolute top-4 right-10 w-64 h-72 rounded-2xl overflow-hidden shadow-lg rotate-6 hover:rotate-2 transition-transform duration-500 ease-out'>
              <img src={img1} alt='Resort Pool' className='w-full h-full object-cover select-none pointer-events-none' />
            </div>
            <div className='absolute bottom-4 left-6 w-60 h-64 rounded-2xl overflow-hidden shadow-2xl -rotate-6 hover:rotate-0 transition-transform duration-500 ease-out z-10'>
              <img src={img2} alt='Luxury Suite' className='w-full h-full object-cover select-none pointer-events-none' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutHero;
