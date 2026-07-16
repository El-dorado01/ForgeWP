import { WpEditable, defineEditable, text } from '@forgewp/react';
import { StaticHeroSearchBoard } from './StaticHeroSearchBoard';
import { HeroSpotlight } from './HeroSpotlight';

export const editable = defineEditable({
  title: text({ label: 'Heading Title', default: 'Handverlesene' }),
  titleColored: text({ label: 'Heading Colored Part', default: 'Boutique- & Luxushotels' }),
  subtitle: text({
    label: 'Subtitle Text',
    default: 'Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.'
  }),
  searchPlaceholder: text({ label: 'Search Input Placeholder', default: 'Hotelname oder Stadt suchen...' }),
  trendingTags: text({ label: 'Trending Tags (comma-separated)', default: 'Wellness, Boutique, Alpin, Luxus, Design' }),
});

export interface StaticHeroSectionProps {
  title?: string;
  titleColored?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  trendingTags?: string;
  setAttributes?: (attrs: Partial<StaticHeroSectionProps>) => void;
}

/**
 * @forgewp-block
 * title: Static Hero Section
 * category: theme
 * icon: cover-image
 * description: Renders a static version of the home page hero section without dynamic hooks.
 *
 * The search board and spotlight card are separate hydration islands
 * (StaticHeroSearchBoard, HeroSpotlight — the latter shared with HeroSection,
 * since its logic is identical) — this component itself stays fully static
 * so its own padding-bearing outer <section> is never re-rendered client-side.
 */
export function StaticHeroSection({
  title = 'Handverlesene',
  titleColored = 'Boutique- & Luxushotels',
  subtitle = 'Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.',
  searchPlaceholder = 'Hotelname oder Stadt suchen...',
  trendingTags = 'Wellness, Boutique, Alpin, Luxus, Design',
  setAttributes,
}: StaticHeroSectionProps) {
  return (
    <section className='relative w-full overflow-hidden bg-slate-50 selection:bg-primary selection:text-white py-12 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8'>
      {/* Editorial Steel Blue & Accent Blob Gradients */}
      <div className='absolute top-0 right-0 w-150 h-150 bg-[radial-gradient(circle,rgba(109,155,174,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />
      <div className='absolute bottom-0 left-0 w-125 h-125 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />

      <div className='relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10'>
        {/* LEFT COLUMN: Editorial Copy & Search Board (Column Span 7) */}
        <div className='lg:col-span-7 flex flex-col items-start text-left'>
          {/* Heading */}
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-slate-800 leading-[1.1] mb-6 uppercase'>
            <WpEditable
              tagName="span"
              value={title}
              onChange={(val) => setAttributes && setAttributes({ title: val })}
            />
            <br />
            <span className='bg-linear-to-r from-primary via-slate-700 to-accent bg-clip-text text-transparent'>
              <WpEditable
                tagName="span"
                value={titleColored}
                onChange={(val) => setAttributes && setAttributes({ titleColored: val })}
              />
            </span>
          </h1>

          {/* Subtitle */}
          <WpEditable
            tagName="p"
            value={subtitle}
            onChange={(val) => setAttributes && setAttributes({ subtitle: val })}
            className='text-slate-500 text-base sm:text-lg max-w-2xl mb-10 font-sans font-normal leading-relaxed'
          />

          <StaticHeroSearchBoard searchPlaceholder={searchPlaceholder} trendingTags={trendingTags} />
        </div>

        {/* RIGHT COLUMN: Premium Magazine Splash Image & Float Card (Column Span 5) */}
        <div className='lg:col-span-5 flex items-center justify-center relative w-full mt-8 lg:mt-0'>
          <HeroSpotlight />
        </div>
      </div>
    </section>
  );
}

export default StaticHeroSection;
