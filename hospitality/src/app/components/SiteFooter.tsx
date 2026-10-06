import { useWpPageLink, WpImage, WpLink } from '@forgewp/react';

export default function SiteFooter() {
  const homeHref = useWpPageLink('front-page', '/');
  const impressumHref = useWpPageLink('impressum-page', '/impressum');
  const privacyHref = useWpPageLink('datenschutz-page', '/datenschutz');
  const termsHref = useWpPageLink(
    'agb-lizenzbedingungen-page',
    '/agb-lizenzbedingungen',
  );
  const withdrawalHref = useWpPageLink(
    'widerrufsbelehrung-page',
    '/widerrufsbelehrung',
  );
  const withdrawalFormHref = useWpPageLink(
    'vertrag-widerrufen-page',
    '/vertrag-widerrufen',
  );
  const contactHref = useWpPageLink('kontakt-page', '/kontakt');

  return (
    <footer className='border-t border-slate-200 bg-brand px-5 py-12 text-white sm:px-8 lg:px-12 lg:py-16'>
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-24'>
          <div>
            <WpLink
              href={homeHref}
              className='relative block h-12 w-36'
              aria-label='DICON home'
            >
              <WpImage
                src='/Logo_DICON-removebg-preview.png'
                alt='DICON Beratung'
                className='h-full w-full object-contain object-left'
              />
            </WpLink>
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
                <WpLink
                  href={impressumHref}
                  className='hover:text-white'
                >
                  Impressum
                </WpLink>
                <WpLink
                  href={privacyHref}
                  className='hover:text-white'
                >
                  Datenschutzerklärung
                </WpLink>
                <WpLink
                  href={termsHref}
                  className='hover:text-white'
                >
                  AGB & Lizenzbedingungen
                </WpLink>
                <WpLink
                  href={withdrawalHref}
                  className='hover:text-white'
                >
                  Widerrufsbelehrung
                </WpLink>
                <WpLink
                  href={withdrawalFormHref}
                  className='font-semibold text-accent hover:text-white'
                >
                  Vertrag widerrufen
                </WpLink>
                <WpLink
                  href={contactHref}
                  className='hover:text-white'
                >
                  Kontakt
                </WpLink>
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
  );
}
