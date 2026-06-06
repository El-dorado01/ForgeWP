import { WpHead, WpLink, useWpI18n, useWpLanguage } from '../../.forgewp/wordpress';
import { ChevronRight, FileText, MapPin, Mail, Landmark, ShieldCheck } from 'lucide-react';

export function ImpressumPage() {
  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Impressum — Hotelchecker24')}
        description={__('Offizielles Impressum und gesetzliche Offenlegung von Hotelchecker24.')}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href={homeHref} className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">{__('Impressum')}</span>
          </nav>
          
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
              <FileText className="w-3.5 h-3.5" />
              {__('Gesetzliche Offenlegung')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
              {__('Impressum')}
            </h1>
          </div>
        </div>
      </div>

      {/* Impressum Content Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main details card */}
          <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            
            {/* Owner details */}
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#929f5d] mb-2">{__('Medieninhaber & Unternehmensbezeichnung')}</h2>
              <p className="text-lg font-black text-slate-900 uppercase tracking-tight">maxonline® Marketing hfw GesmbH</p>
              <p className="text-slate-500 text-sm mt-1">{__('Rechtsform: Gesellschaft mit beschränkter Haftung')}</p>
            </div>

            <hr className="border-slate-100" />

            {/* Address */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#929f5d]/10 border border-[#929f5d]/20 flex items-center justify-center shrink-0 text-[#929f5d]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1">{__('Firmensitz & Anschrift')}</h3>
                <p className="text-sm font-bold text-slate-800">Coronablick 7</p>
                <p className="text-sm font-bold text-slate-800">A-3652 Leiben</p>
                <p className="text-sm font-semibold text-slate-500 mt-0.5">{__('Österreich')}</p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Contacts */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1">{__('Kontakt')}</h3>
                <a href="mailto:office@max-online.at" className="text-sm font-bold text-slate-800 hover:text-primary transition-colors">office@max-online.at</a>
                <p className="text-xs font-semibold text-slate-500 mt-1">{__('Internet:')} <a href="https://max-online.at" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">www.max-online.at</a></p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Registration information */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-600">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1">{__('Register & Gerichtsstand')}</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                  <div>
                    <span className="text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5">{__('Firmenbuchnummer')}</span>
                    FN 659087 x
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5">{__('Umsatzsteuer-ID')}</span>
                    ATU82431815
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-700 pt-1">
                  <span className="text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5">{__('Gerichtsstandort')}</span>
                  {__('Landesgericht St. Pölten')}
                </div>
              </div>
            </div>

          </div>

          {/* Legal / Regulatory sidebar */}
          <div className="bg-slate-100/60 border border-slate-200/50 rounded-2xl p-6 shadow-xs h-fit space-y-5">
            <h2 className="text-sm font-black uppercase text-slate-800 border-b border-slate-200/60 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {__('Rechtliche Hinweise')}
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">{__('Unternehmensgegenstand')}</h3>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {__('Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik.')}
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">{__('Aufsichtsbehörde')}</h3>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {__('Bezirkshauptmannschaft Melk (gemäß E-Commerce Gesetz - ECG)')}
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">{__('Markenschutz')}</h3>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {__('maxonline® ist eine eingetragene Wortbildmarke.')}<br />
                  {__('Markenregister Aktenzeichen: AM 12102/2019')}<br />
                  {__('Register-Nr.: 305857')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

export default ImpressumPage;
