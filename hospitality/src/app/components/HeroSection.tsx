import { forwardRef } from 'react';
import { ArrowDownRight, Eye, ShoppingBag } from 'lucide-react';
import { pickEditable, useWpMeta, WpEditable, WpImage } from '@forgewp/react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as heroDefaults } from '../../../cms/editables/sections/hero';
import LandingSection from './LandingSection';

export const editable = pickEditable(pageEditable, {
  eyebrow: 'hero_eyebrow',
  location: 'hero_location',
  word: 'hero_word',
  year: 'hero_year',
  summary: 'hero_summary',
  subtitle: 'hero_subtitle',
  previewLabel: 'hero_preview_label',
  previewUrl: 'hero_preview_url',
  buyLabel: 'hero_buy_label',
  buyUrl: 'hero_buy_url',
  scrollLabel: 'hero_scroll_label',
  scrollUrl: 'hero_scroll_url',
  coverImage: 'hero_cover_image',
  coverAlt: 'hero_cover_alt',
});

export type HeroSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  location?: string;
  word?: string;
  year?: string;
  summary?: string;
  subtitle?: string;
  previewLabel?: string;
  previewUrl?: string;
  buyLabel?: string;
  buyUrl?: string;
  scrollLabel?: string;
  scrollUrl?: string;
  coverImage?: string | number | { id?: number; url?: string; alt?: string };
  coverAlt?: string;
  setAttributes?: (attributes: Partial<HeroSectionProps>) => void;
};

const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  function HeroSection(
    {
      reduceMotion,
      revealInitial,
      revealVariants,
      eyebrow: eyebrowProp,
      location: locationProp,
      word: wordProp,
      year: yearProp,
      summary: summaryProp,
      subtitle: subtitleProp,
      previewLabel: previewLabelProp,
      previewUrl: previewUrlProp,
      buyLabel: buyLabelProp,
      buyUrl: buyUrlProp,
      scrollLabel: scrollLabelProp,
      scrollUrl: scrollUrlProp,
      coverImage: coverImageProp,
      coverAlt: coverAltProp,
      setAttributes,
    },
    ref,
  ) {
    const eyebrowMeta = useWpMeta('hero_eyebrow', heroDefaults.eyebrow);
    const locationMeta = useWpMeta('hero_location', heroDefaults.location);
    const wordMeta = useWpMeta('hero_word', heroDefaults.word);
    const yearMeta = useWpMeta('hero_year', heroDefaults.year);
    const summaryMeta = useWpMeta('hero_summary', heroDefaults.summary);
    const subtitleMeta = useWpMeta('hero_subtitle', heroDefaults.subtitle);
    const previewLabelMeta = useWpMeta(
      'hero_preview_label',
      heroDefaults.previewLabel,
    );
    const previewUrl =
      previewUrlProp ?? useWpMeta('hero_preview_url', heroDefaults.previewUrl);
    const buyLabelMeta = useWpMeta('hero_buy_label', heroDefaults.buyLabel);
    const buyUrl = buyUrlProp ?? useWpMeta('hero_buy_url', heroDefaults.buyUrl);
    const scrollLabelMeta = useWpMeta(
      'hero_scroll_label',
      heroDefaults.scrollLabel,
    );
    const scrollUrl =
      scrollUrlProp ?? useWpMeta('hero_scroll_url', heroDefaults.scrollUrl);
    const coverImage =
      coverImageProp ??
      useWpMeta('hero_cover_image', heroDefaults.coverImage);
    const coverAltMeta = useWpMeta('hero_cover_alt', heroDefaults.coverAlt);

    const eyebrow = eyebrowProp ?? eyebrowMeta;
    const location = locationProp ?? locationMeta;
    const word = wordProp ?? wordMeta;
    const year = yearProp ?? yearMeta;
    const summary = summaryProp ?? summaryMeta;
    const subtitle = subtitleProp ?? subtitleMeta;
    const previewLabel = previewLabelProp ?? previewLabelMeta;
    const buyLabel = buyLabelProp ?? buyLabelMeta;
    const scrollLabel = scrollLabelProp ?? scrollLabelMeta;
    const coverAlt = coverAltProp ?? coverAltMeta;

    return (
      <LandingSection
        ref={ref}
        className='relative mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-[1440px] flex-col justify-between px-5 pb-8 pt-6 sm:px-8 lg:px-12 lg:pb-12 lg:pt-8'
      >
        <motion.div
          className='relative z-10 flex items-start justify-between'
          initial={revealInitial}
          animate='visible'
          variants={revealVariants}
          transition={{ delay: 0.18 }}
        >
          <p className='max-w-[180px] text-[10px] font-semibold uppercase leading-[1.5] tracking-[0.2em] text-slate-500'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={eyebrow}
                onChange={(value) => setAttributes({ eyebrow: value })}
              />
            ) : (
              eyebrow
            )}
          </p>
          <p className='text-right font-serif text-sm italic text-slate-500'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={location}
                onChange={(value) => setAttributes({ location: value })}
              />
            ) : (
              location
            )}
          </p>
        </motion.div>

        <div className='relative flex flex-1 -translate-y-10 items-center justify-center py-4 lg:-translate-y-20 lg:py-0'>
          <motion.div
            className='absolute left-1/2 top-[58%] z-0 w-screen -translate-x-1/2 -translate-y-1/2 sm:top-1/2 sm:w-full'
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 1, ease: 'easeOut' }}
          >
            <h1 className='w-full scale-x-[1.01] text-center font-heading text-[clamp(4.75rem,16vw,16rem)] font-black uppercase leading-[0.6] tracking-[-0.08em] text-brand/95 sm:scale-x-[1.02] sm:text-[clamp(5.5rem,17vw,16rem)]'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={word}
                  onChange={(value) => setAttributes({ word: value })}
                />
              ) : (
                word
              )}
            </h1>
          </motion.div>
          <motion.div
            className='group relative z-10 mt-8 w-[min(68vw,390px)] [perspective:1400px] sm:mt-12 lg:w-[min(28vw,410px)]'
            initial={revealInitial}
            animate='visible'
            variants={revealVariants}
            transition={{ delay: 0.42, duration: 0.9 }}
          >
            <div className='absolute -inset-x-8 bottom-0 h-16 translate-y-8 rounded-[50%] bg-brand/20 blur-2xl transition-all duration-700 group-hover:scale-110 group-hover:bg-accent/15' />
            <div className='relative [transform:rotateY(-9deg)_rotateZ(-2deg)] transition-transform duration-700 ease-out group-hover:[transform:rotateY(-3deg)_rotateZ(-1deg)_translateY(-8px)]'>
              <div className='absolute -right-3 top-2 bottom-2 w-3 origin-left skew-y-[2deg] bg-slate-300 shadow-inner' />
              <div className='absolute -left-1 top-2 bottom-2 w-1 bg-white/40 blur-[1px]' />
              <WpImage
                src={coverImage || '/assets/hospitality-cover.png'}
                alt={coverAlt}
                priority
                className='relative block aspect-[0.7] w-full object-cover shadow-[20px_28px_30px_rgba(15,23,42,0.25),3px_4px_0_rgba(15,23,42,0.12)]'
              />
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-brand/10 mix-blend-screen' />
            </div>
          </motion.div>
          <motion.span
            className='absolute left-1/2 top-[78%] z-0 w-full -translate-x-1/2 translate-y-[8%] scale-x-[0.94] text-center font-heading text-[clamp(5.5rem,24vw,16rem)] font-black uppercase leading-[-0.2em] sm:leading-[0.6] tracking-[-0.1em] text-accent sm:top-[82%] sm:z-0 sm:scale-x-[1.02] sm:text-[clamp(5.5rem,17vw,16rem)]'
            initial={revealInitial}
            animate='visible'
            variants={revealVariants}
            transition={{ delay: 0.64, duration: 0.8 }}
          >
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={year}
                onChange={(value) => setAttributes({ year: value })}
              />
            ) : (
              year
            )}
          </motion.span>
        </div>

        <motion.div
          className='relative z-20 flex flex-col gap-6 pt-6 sm:pt-2 sm:flex-row sm:items-end sm:justify-between'
          initial={revealInitial}
          animate='visible'
          variants={revealVariants}
          transition={{ delay: 0.76 }}
        >
          <p className='max-w-md text-sm leading-relaxed text-slate-600'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={summary}
                onChange={(value) => setAttributes({ summary: value })}
              />
            ) : (
              summary
            )}
          </p>
          <div className='flex shrink-0 flex-col items-start gap-2 sm:items-end'>
            <p className='mb-4 max-w-[420px] sm:max-w-[240px] text-right text-xs font-semibold uppercase leading-[1.5] tracking-[0.2em] text-slate-500'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={subtitle}
                  onChange={(value) => setAttributes({ subtitle: value })}
                />
              ) : (
                subtitle
              )}
            </p>
            <div className='flex flex-wrap items-center justify-end gap-3'>
              <a
                href={previewUrl || '#preview'}
                className='inline-flex items-center gap-2 border border-slate-300 px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand transition-colors hover:border-brand hover:bg-white hover:text-accent'
              >
                <Eye className='size-4' />
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={previewLabel}
                    onChange={(value) => setAttributes({ previewLabel: value })}
                  />
                ) : (
                  previewLabel
                )}
              </a>
              <a
                href={buyUrl || '#buy'}
                className='inline-flex items-center gap-2 border border-accent bg-accent px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(225,29,72,0.2)] transition-all hover:-translate-y-0.5 hover:bg-transparent  hover:border-slate-300 hover:text-brand hover:shadow-[0_12px_26px_rgba(15,23,42,0.2)]'
              >
                <ShoppingBag className='size-4' />
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={buyLabel}
                    onChange={(value) => setAttributes({ buyLabel: value })}
                  />
                ) : (
                  buyLabel
                )}
              </a>
            </div>
          </div>
        </motion.div>

        <a
          href={scrollUrl || '#study'}
          className='absolute bottom-12 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 lg:flex'
        >
          {setAttributes ? (
            <WpEditable
              tagName='span'
              value={scrollLabel}
              onChange={(value) => setAttributes({ scrollLabel: value })}
            />
          ) : (
            scrollLabel
          )}{' '}
          <ArrowDownRight className='size-3.5' />
        </a>
      </LandingSection>
    );
  },
);

export default HeroSection;
