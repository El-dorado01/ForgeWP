import { useWpMeta } from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as frontPageEditable, defaults } from '../../cms/editables/front-page';
import { HeroSearchBoard } from './HeroSearchBoard';
import { HeroSpotlight } from './HeroSpotlight';

/** Page content from ACF + block-only layout (padding never on page ACF). */
export const editable = pickEditable(frontPageEditable, {
    title: 'hero_title',
    titleColored: 'hero_title_colored',
    subtitle: 'hero_subtitle',
    searchPlaceholder: 'hero_search_placeholder',
  });


export interface HeroSectionProps {
  title?: string;
  titleColored?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  setAttributes?: (attrs: Partial<HeroSectionProps>) => void;
}

/**
 * @forgewp-block
 * title: Hero Section
 * category: theme
 * icon: cover-image
 * description: Home hero with search and spotlight hotel.
 *
 * The search board and spotlight card are separate hydration islands
 * (HeroSearchBoard, HeroSpotlight) — this component itself stays fully
 * static (no hooks/handlers of its own beyond the editor-only WpEditable
 * fields) so its own padding-bearing outer <section> is never re-rendered
 * client-side.
 */
export function HeroSection({
  title: titleProp,
  titleColored: titleColoredProp,
  subtitle: subtitleProp,
  searchPlaceholder: searchPlaceholderProp,
  setAttributes,
}: HeroSectionProps) {
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const titleColoredMeta = useWpMeta('hero_title_colored', defaults.hero_title_colored);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const searchPlaceholderMeta = useWpMeta(
    'hero_search_placeholder',
    defaults.hero_search_placeholder,
  );

  const title = titleProp ?? titleMeta;
  const titleColored = titleColoredProp ?? titleColoredMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const searchPlaceholder = searchPlaceholderProp ?? searchPlaceholderMeta;

  return (
    <section className='relative w-full overflow-hidden bg-slate-50 selection:bg-primary selection:text-white py-12 sm:py-16'>
      {/* Editorial Steel Blue & Accent Blob Gradients */}
      <div className='absolute top-0 right-0 w-150 h-150 bg-[radial-gradient(circle,rgba(109,155,174,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />
      <div className='absolute bottom-0 left-0 w-125 h-125 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />

      {/* Side padding only on max-w shell (matches nav / About — avoids island double-px) */}
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10'>
        {/* LEFT COLUMN: Editorial Copy & Search Board (Column Span 7) */}
        <div className='lg:col-span-7 flex flex-col items-start text-left'>
          {/* Heading */}
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-slate-800 leading-[1.1] mb-6 uppercase'>
            {setAttributes ? (
              <WpEditable
                tagName="span"
                value={title}
                onChange={(val) => setAttributes({ title: val })}
              />
            ) : (
              title
            )}
            <br />
            <span className='bg-linear-to-r from-primary via-slate-700 to-accent bg-clip-text text-transparent'>
              {setAttributes ? (
                <WpEditable
                  tagName="span"
                  value={titleColored}
                  onChange={(val) => setAttributes({ titleColored: val })}
                />
              ) : (
                titleColored
              )}
            </span>
          </h1>

          {/* Subtitle */}
          {setAttributes ? (
            <WpEditable
              tagName="p"
              value={subtitle}
              onChange={(val) => setAttributes({ subtitle: val })}
              className='text-slate-500 text-base sm:text-lg max-w-2xl mb-10 font-sans font-normal leading-relaxed'
            />
          ) : (
            <p className='text-slate-500 text-base sm:text-lg max-w-2xl mb-10 font-sans font-normal leading-relaxed'>
              {subtitle}
            </p>
          )}

          <HeroSearchBoard searchPlaceholder={searchPlaceholder} />
        </div>

        {/* RIGHT COLUMN: Premium Magazine Splash Image & Float Card (Column Span 5) */}
        <div className='lg:col-span-5 flex items-center justify-center relative w-full mt-8 lg:mt-0'>
          <HeroSpotlight />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
