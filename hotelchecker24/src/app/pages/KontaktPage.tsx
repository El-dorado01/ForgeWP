
import { WpHead, WpLink, useWpOption, useWpI18n, useWpMeta, useWpLanguage, defineEditable, text, image } from '../../.forgewp/wordpress';
import { Hydrate } from '@forgewp/react';
import {
  Mail, Phone, MapPin, Clock, ChevronRight,
  MessageSquare, Globe, Instagram, Facebook, Twitter,
  Youtube, Linkedin, ArrowRight,
} from 'lucide-react';

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    style={props.style}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .57.04.84.13V9.25a6.29 6.29 0 0 0-1.84-.27A6.3 6.3 0 0 0 2 15.28a6.3 6.3 0 0 0 10.3 4.84V8a8.29 8.29 0 0 0 5.3 1.9v-3.2a4.81 4.81 0 0 1 1.99-.01z" />
  </svg>
);

const PinterestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    style={props.style}
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.16-.1-.95-.2-2.4 0-3.43l1.24-5.27s-.32-.64-.32-1.57c0-1.48.86-2.58 1.92-2.58.9 0 1.34.68 1.34 1.5 0 .9-.58 2.27-.88 3.53-.25 1.06.53 1.92 1.58 1.92 1.9 0 3.36-2 3.36-4.88 0-2.55-1.83-4.33-4.44-4.33-3.03 0-4.8 2.27-4.8 4.6 0 .92.35 1.9.8 2.44.09.1.1.18.07.3l-.3 1.22c-.05.2-.16.24-.37.14C4.85 16.48 4 13.9 4 11.42c0-4.07 2.96-7.8 8.52-7.8 4.47 0 7.95 3.19 7.95 7.45 0 4.44-2.8 8.02-6.7 8.02-1.3 0-2.53-.68-2.95-1.48l-.8 3.05c-.29 1.1-.1 2.47-.02 2.62.94.29 1.93.44 2.97.44 6.63 0 12-5.37 12-12S18.63 0 12 0z" />
  </svg>
);
import ContactForm from '../../components/ContactForm';

const getImageUrl = (imageVal: any) => {
  if (!imageVal) return '';
  if (typeof imageVal === 'string') return imageVal;
  return imageVal.url || '';
};

export function KontaktPage() {
  const phone = useWpOption('contact_phone', '+43 1 234 5678');
  const email = useWpOption('contact_email', 'office@max-online.at');
  const address = useWpOption('contact_address', 'Coronablick 7, A-3652 Leiben, Österreich');
  const hours = useWpOption('business_hours', 'Mo–Fr 09:00–18:00 Uhr');

  const facebookUrl = useWpOption('social_facebook', '');
  const instagramUrl = useWpOption('social_instagram', '');
  const twitterUrl = useWpOption('social_twitter', '');
  const youtubeUrl = useWpOption('social_youtube', '');
  const tiktokUrl = useWpOption('social_tiktok', '');
  const linkedinUrl = useWpOption('social_linkedin', '');
  const pinterestUrl = useWpOption('social_pinterest', '');
  const siteUrl = useWpOption('siteurl', 'https://hotelchecker24.com');

  const getSocialHandle = (url: string, defaultHandle: string) => {
    if (!url) return defaultHandle;
    try {
      const parts = url.replace(/\/$/, '').split('/');
      return parts.length > 0 ? parts[parts.length - 1] : defaultHandle;
    } catch (e) {
      return defaultHandle;
    }
  };

  const instagramHandle = instagramUrl ? `@${getSocialHandle(instagramUrl, 'hotelchecker24')}` : '';
  const facebookHandle = facebookUrl ? getSocialHandle(facebookUrl, 'Hotelchecker24') : '';
  const twitterHandle = twitterUrl ? `@${getSocialHandle(twitterUrl, 'hotelchecker24')}` : '';
  const youtubeHandle = youtubeUrl ? getSocialHandle(youtubeUrl, 'Hotelchecker24') : '';
  const tiktokHandle = tiktokUrl ? `@${getSocialHandle(tiktokUrl, 'hotelchecker24')}` : '';
  const linkedinHandle = linkedinUrl ? getSocialHandle(linkedinUrl, 'Hotelchecker24') : '';
  const pinterestHandle = pinterestUrl ? getSocialHandle(pinterestUrl, 'Hotelchecker24') : '';
  const siteHandle = siteUrl ? siteUrl.replace(/^https?:\/\/(www\.)?/, '') : 'hotelchecker24.com';

  const socialList = [
    { icon: Instagram, label: 'Instagram', handle: instagramHandle, href: instagramUrl },
    { icon: Facebook, label: 'Facebook', handle: facebookHandle, href: facebookUrl },
    { icon: Twitter, label: 'Twitter / X', handle: twitterHandle, href: twitterUrl },
    { icon: Youtube, label: 'YouTube', handle: youtubeHandle, href: youtubeUrl },
    { icon: TiktokIcon, label: 'TikTok', handle: tiktokHandle, href: tiktokUrl },
    { icon: Linkedin, label: 'LinkedIn', handle: linkedinHandle, href: linkedinUrl },
    { icon: PinterestIcon, label: 'Pinterest', handle: pinterestHandle, href: pinterestUrl },
    { icon: Globe, label: 'Website', handle: siteHandle, href: siteUrl },
  ].filter(social => social.href && social.href.trim() !== '');

  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;

  // Page-specific editable content fields
  const heroBadge = useWpMeta('hero_badge', __('Wir sind für Sie da'));
  const heroTitle = useWpMeta('hero_title', __('Schreiben Sie uns'));
  const heroSubtitle = useWpMeta('hero_subtitle', __('Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.'));
  const formTitle = useWpMeta('form_title', __('Kontaktformular'));
  const formDescription = useWpMeta('form_description', __('Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.'));
  const cardImage = useWpMeta('card_image', 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80');
  const cardBadge = useWpMeta('card_badge', __('Hauptredaktion Wien'));

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Kontakt — Hotelchecker24')}
        description={__('Kontaktieren Sie die Hotelchecker24-Redaktion. Wir helfen Ihnen bei Fragen zu Hotels, Reiseempfehlungen und Kooperationsanfragen.')}
      />

      {/* Hero — compact light editorial two-column */}
      <div className="relative overflow-hidden bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href={homeHref} className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">{__('Kontakt')}</span>
          </nav>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            {/* Left Column — Headings */}
            <div className="lg:col-span-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
                <MessageSquare className="w-3.5 h-3.5" />
                {heroBadge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
                {heroTitle}
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                {heroSubtitle}
              </p>
            </div>

            {/* Right Column — Editorial Vienna Visual Card */}
            <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center h-[200px] select-none">
              <div className="relative w-72 h-44 rounded-2xl overflow-hidden shadow-xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
                <img 
                  src={getImageUrl(cardImage)} 
                  alt={__('Wien Redaktion')} 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Location Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>{cardBadge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Contact Info Sidebar */}
          <aside className="lg:col-span-2 space-y-5">
            {/* Info cards */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                {__('Kontaktdaten')}
              </h2>

              {[
                { icon: Phone, label: 'Telefon', value: phone, href: `tel:${phone}`, color: 'text-primary bg-primary/10 border-primary/20' },
                { icon: Mail, label: 'E-Mail', value: email, href: `mailto:${email}`, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { icon: MapPin, label: 'Adresse', value: address, href: undefined, color: 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20' },
                { icon: Clock, label: 'Öffnungszeiten', value: hours, href: undefined, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              ].map(({ icon: Icon, label, value, href, color }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500 mb-0.5">{__(label)}</div>
                    {href ? (
                      <a href={href} className="text-sm font-bold text-slate-800 hover:text-primary transition-colors break-all">{value}</a>
                    ) : (
                      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            {socialList.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 mb-4">
                  Social Media
                </h2>
                <div className="space-y-2">
                  {socialList.map(({ icon: Icon, label, handle, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-slate-100 hover:border-primary rounded-xl transition-all duration-300 group hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary transition-all">
                          <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                        </div>
                        <div>
                          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">{label}</div>
                          <div className="text-xs font-bold text-slate-800">{handle}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Contact Form — hydration island */}
          <div className="lg:col-span-3">
            <Hydrate trigger="load">
              <ContactForm formTitle={formTitle} formDescription={formDescription} />
            </Hydrate>
          </div>

        </div>
      </div>
    </main>
  );
}

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Wir sind für Sie da',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Schreiben Sie uns',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default: 'Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.',
  }),
  card_image: image({
    label: 'Visual Card Image',
    default: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80',
  }),
  card_badge: text({
    label: 'Visual Card Badge',
    default: 'Hauptredaktion Wien',
  }),
  form_title: text({
    label: 'Form Title',
    default: 'Kontaktformular',
  }),
  form_description: text({
    label: 'Form Description',
    default: 'Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.',
  }),
});
