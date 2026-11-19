import { useWpPageLink, WpHead, WpLink } from '@forgewp/react';
import { useEffect, useState } from 'react';
import { useReducedMotion, type Variants } from 'framer-motion';
import StudySection from '../components/StudySection';
import PreviewSection from '../components/PreviewSection';
import PartnersSection from '../components/PartnersSection';

export const pageConfig = { layout: 'default' };

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export function DieStudiePage() {
  const licensesHref = useWpPageLink('lizenzen-page', '/lizenzen');
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : 'hidden';
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    setPageReady(true);
  }, []);

  return (
    <main className='min-h-screen overflow-hidden bg-[#f8fafc] text-brand'>
      <WpHead
        title='Hospitality 2035 – Die Studie | DICON'
        description='Hospitality 2035 untersucht, wie sich die wirtschaftliche Logik der Hotellerie verändert.'
        ogType='article'
      />

      <section className='border-b border-slate-200 bg-brand px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28'>
        <div className='mx-auto max-w-[1440px]'>
          <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent'>
            Hospitality 2035 / Die Studie
          </p>
          <h1 className='mt-8 max-w-5xl font-heading text-6xl font-black leading-[0.84] tracking-[-0.08em] sm:text-8xl lg:text-[10rem]'>
            Wie sich die wirtschaftliche Logik der Hotellerie verändert.
          </h1>
          <p className='mt-10 max-w-2xl text-lg leading-relaxed text-slate-300'>
            Eine strategische Studie über Kosten, Technologie, Betreiber- und
            Raumkonzepte sowie die nächste Phase der Hospitality.
          </p>
        </div>
      </section>

      <StudySection
        eyebrow='01 / Die Studie'
        reduceMotion={reduceMotion}
        revealInitial={revealInitial}
        revealVariants={revealVariants}
      />
      <PreviewSection
        eyebrow='02 / Vorschau'
        reduceMotion={reduceMotion}
        revealInitial={revealInitial}
        revealVariants={revealVariants}
      />
      <PartnersSection
        eyebrow='03 / Netzwerk'
        reduceMotion={reduceMotion}
        revealInitial={revealInitial}
        revealVariants={revealVariants}
      />

      <section className='border-t border-slate-200 bg-accent px-5 py-16 text-white sm:px-8 lg:px-12'>
        <div className='mx-auto flex max-w-[1440px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-white/70'>
              Weiter zur Lizenz
            </p>
            <h2 className='mt-3 font-heading text-4xl font-black tracking-[-0.06em] sm:text-6xl'>
              Die vollständige Studie lesen.
            </h2>
          </div>
          <WpLink
            href={licensesHref}
            className='inline-flex items-center justify-center border border-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-accent'
          >
            Lizenzmodelle ansehen
          </WpLink>
        </div>
      </section>

      {!pageReady && <span className='sr-only'>Loading study</span>}
    </main>
  );
}
