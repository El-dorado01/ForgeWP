import { WpHead, WpLink, useWpI18n, useWpLanguage, useWpMeta, defineEditable, text } from '../../.forgewp/wordpress';
import { Newspaper, ChevronRight } from 'lucide-react';
import { Hydrate } from '@forgewp/react';
import { ListiclesWorkspace } from '../../components/ListiclesWorkspace';

export function ListiclesPage() {
  const { __ } = useWpI18n();
  const { urls, currentLanguage } = useWpLanguage();
  const homeHref = urls[currentLanguage] || '/';

  const heroBadge = useWpMeta('hero_badge', __('Redaktionelles Magazin'));
  const heroTitle = useWpMeta('hero_title', __('Hotelvergleiche'));
  const heroSubtitle = useWpMeta('hero_subtitle', __('Handverlesene Hotelvergleiche, Destinations-Guides und Insider-Tipps — verfasst von unserer Reiseredaktion.'));

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Hotelvergleiche — Hotelchecker24')}
        description={__('Kuratierte Hotelvergleiche, Hotellisten und Insider-Tipps von unserer Redaktion. Entdecken Sie die besten Hotels und Reiseziele.')}
      />

      {/* Hero — compact light editorial */}
      <div className="relative overflow-hidden bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href={homeHref} className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">{__('Hotelvergleiche')}</span>
          </nav>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
                <Newspaper className="w-3.5 h-3.5" />
                {heroBadge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
                {heroTitle}
              </h1>
              <p className="text-slate-500 text-sm max-w-xl">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic workspace island */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Hydrate trigger="load">
          <ListiclesWorkspace />
        </Hydrate>
      </div>
    </main>
  );
}

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Redaktionelles Magazin',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Hotelvergleiche',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default: 'Handverlesene Hotelvergleiche, Destinations-Guides und Insider-Tipps — verfasst von unserer Reiseredaktion.',
  }),
});
