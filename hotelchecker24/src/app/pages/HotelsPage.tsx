import { WpHead, useWpI18n, WpLink, useWpLanguage, useWpMeta, defineEditable, text } from '../../.forgewp/wordpress';
import { ChevronRight } from 'lucide-react';
import { Hydrate } from '@forgewp/react';
import { HotelsWorkspace } from '../../components/HotelsWorkspace';

export function HotelsPage() {
  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;

  const heroTitle = useWpMeta('hero_title', __('Hotelverzeichnis'));
  const heroSubtitle = useWpMeta('hero_subtitle', __('Kuratierte Auswahl an Luxushotels, Boutique-Resorts und Stadthotels in den schönsten Reisezielen der Welt.'));

  return (
    <main className='min-h-screen bg-[#fafaf8] font-sans select-none'>
      <WpHead
        title={__('Hotels — Hotelchecker24')}
        description={__(
          'Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und exklusiven Unterkünften weltweit.',
        )}
      />

      {/* Page Hero — compact light editorial */}
      <div className='relative overflow-hidden bg-slate-50 py-8 px-4 sm:px-6 lg:px-8'>
        <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none' />
        <div className='absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none' />

        <div className='relative max-w-7xl mx-auto z-10'>
          <nav className='flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4'>
            <WpLink
              href={homeHref}
              className='hover:text-primary transition-colors'
            >
              {__('Startseite')}
            </WpLink>
            <ChevronRight className='w-4 h-4' />
            <span className='text-slate-700'>{__('Hotels')}</span>
          </nav>
          <h1 className='text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2'>
            {heroTitle}
          </h1>
          <p className='text-slate-500 text-sm max-w-2xl'>
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* Main content workspace island */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        <Hydrate trigger='load'>
          <HotelsWorkspace />
        </Hydrate>
      </div>
    </main>
  );
}

export const editable = defineEditable({
  hero_title: text({
    label: 'Hero Title',
    default: 'Hotelverzeichnis',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default: 'Kuratierte Auswahl an Luxushotels, Boutique-Resorts und Stadthotels in den schönsten Reisezielen der Welt.',
  }),
});
