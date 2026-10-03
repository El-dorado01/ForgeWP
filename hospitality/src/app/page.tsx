import { WpHead } from '@forgewp/react';
import { useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import AboutSection from './components/AboutSection';
import AudienceSection from './components/AudienceSection';
import AutomationSection from './components/AutomationSection';
import CheckoutSection from './components/CheckoutSection';
import EventsSection from './components/EventsSection';
import HeroSection from './components/HeroSection';
import LicensingSection from './components/LicensingSection';
import PartnersSection from './components/PartnersSection';
import PreviewSection from './components/PreviewSection';
import SiteNavigation from './components/SiteNavigation';
import StudySection from './components/StudySection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : 'hidden';
  const heroRef = useRef<HTMLElement>(null);
  const [heroPassed, setHeroPassed] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeroPassed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionId = decodeURIComponent(window.location.hash.slice(1));
    if (!sectionId) return;

    let cancelled = false;
    let timeout = 0;
    let frame = 0;

    const scrollToSection = () => {
      void document.fonts.ready.then(() => {
        if (cancelled) return;

        timeout = window.setTimeout(() => {
          frame = window.requestAnimationFrame(() => {
            const target = document.getElementById(sectionId);
            if (!target) return;

            const headerHeight =
              document.querySelector('header')?.getBoundingClientRect()
                .height ?? 0;
            const top =
              target.getBoundingClientRect().top +
              window.scrollY -
              headerHeight -
              24;

            window.scrollTo({
              top,
              behavior: reduceMotion ? 'auto' : 'smooth',
            });
          });
        }, 100);
      });
    };

    if (document.readyState === 'complete') {
      scrollToSection();
    } else {
      window.addEventListener('load', scrollToSection, { once: true });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('load', scrollToSection);
    };
  }, [reduceMotion]);

  return (
    <div className='min-h-screen overflow-hidden bg-[#f8fafc] text-brand selection:bg-accent selection:text-white'>
      <WpHead
        title='Hospitality 2035 | DICON'
        description='Wie sich die wirtschaftliche Logik der Hotellerie verändert.'
        ogType='website'
      />

      <SiteNavigation
        heroPassed={heroPassed}
        reduceMotion={reduceMotion}
        revealInitial={revealInitial}
        revealVariants={revealVariants}
      />

      <main>
        <HeroSection
          ref={heroRef}
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <StudySection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <AudienceSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <PreviewSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <EventsSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <LicensingSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <AutomationSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <PartnersSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <AboutSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />

        <CheckoutSection
          reduceMotion={reduceMotion}
          revealInitial={revealInitial}
          revealVariants={revealVariants}
        />
      </main>

      <footer className='border-t border-slate-200 bg-brand px-5 py-12 text-white sm:px-8 lg:px-12 lg:py-16'>
        <div className='mx-auto max-w-[1440px]'>
          <div className='grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-24'>
            <div>
              <a
                href='/'
                className='relative block h-12 w-36'
                aria-label='DICON home'
              >
                <span className='absolute left-0 top-0 font-heading text-2xl font-black lowercase leading-none tracking-[-0.08em] text-white'>
                  dicon
                </span>
                <span className='absolute left-4 top-5 font-serif text-lg italic lowercase leading-none tracking-[-0.04em] text-accent'>
                  beratung
                </span>
              </a>
              <p className='mt-8 max-w-xl text-lg leading-relaxed text-slate-300'>
                Hospitality 2035 ist eine Studie von DICON Marketing- und
                Beratungsgesellschaft mbH über die wirtschaftliche Zukunft der
                Hotellerie.
              </p>
            </div>

            <div className='grid gap-8 sm:grid-cols-2'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
                  Kontakt
                </p>
                <address className='mt-5 not-italic text-sm leading-relaxed text-slate-300'>
                  DICON Marketing- und Beratungsgesellschaft mbH
                  <br />
                  Reinhardtstraße 29C
                  <br />
                  10117 Berlin
                  <br />
                  Deutschland
                </address>
                <a
                  href='mailto:contact@dicon-beratung.de'
                  className='mt-5 inline-flex text-sm text-white underline decoration-accent underline-offset-4 hover:text-accent'
                >
                  contact@dicon-beratung.de
                </a>
                <a
                  href='tel:+4930300132500'
                  className='mt-2 block text-sm text-slate-300 hover:text-accent'
                >
                  +49 (0)30 300 132 500
                </a>
              </div>

              <nav aria-label='Rechtliche Informationen'>
                <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
                  Rechtliches
                </p>
                <div className='mt-5 flex flex-col items-start gap-3 text-sm text-slate-300'>
                  <a
                    href='/impressum'
                    className='hover:text-white'
                  >
                    Impressum
                  </a>
                  <a
                    href='/datenschutz'
                    className='hover:text-white'
                  >
                    Datenschutzerklärung
                  </a>
                  <a
                    href='/agb-lizenzbedingungen'
                    className='hover:text-white'
                  >
                    AGB & Lizenzbedingungen
                  </a>
                  <a
                    href='/widerrufsbelehrung'
                    className='hover:text-white'
                  >
                    Widerrufsbelehrung
                  </a>
                  <a
                    href='/vertrag-widerrufen'
                    className='font-semibold text-accent hover:text-white'
                  >
                    Vertrag widerrufen
                  </a>
                  <a
                    href='/kontakt'
                    className='hover:text-white'
                  >
                    Kontakt
                  </a>
                </div>
              </nav>
            </div>
          </div>

          <div className='mt-12 flex flex-col gap-3 border-t border-white/20 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between'>
            <p>© 2026 DICON Marketing- und Beratungsgesellschaft mbH</p>
            <p>Hospitality 2035 · Berlin / Zürich</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
