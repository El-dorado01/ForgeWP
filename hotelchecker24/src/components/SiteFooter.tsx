import React from "react";
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Mail, 
  ArrowRight,
  Globe
} from "lucide-react";
import { WpMenu, useWpOption, useWpThemeMod, useWpThemeUri, useWpI18n, useWpLanguage, WpLink } from "../.forgewp/wordpress";

export default function SiteFooter() {
  const { __ } = useWpI18n();
  const { urls, currentLanguage } = useWpLanguage();
  const homeHref = urls[currentLanguage] || '/';
  const [email, setEmail] = React.useState("");
  const [newsletterStatus, setNewsletterStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = React.useState('');
  const themeUri = useWpThemeUri();

  // Retrieve dynamic site branding options
  const blogDescription = useWpOption(
    "blogdescription",
    "Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa."
  );

  // Retrieve dynamic social media options
  const socialFacebook = useWpOption("social_facebook", "https://facebook.com/hotelchecker24");
  const socialInstagram = useWpOption("social_instagram", "https://instagram.com/hotelchecker24");
  const socialTwitter = useWpOption("social_twitter", "https://twitter.com/hotelchecker24");

  // Retrieve dynamic theme customization options
  const footerText = useWpThemeMod(
    "footer_text",
    `© ${new Date().getFullYear()} Hotelchecker24. All rights reserved.`
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setNewsletterStatus('sending');
    setNewsletterError('');
    try {
      const res = await fetch('/wp-json/mailpoet/v1/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: 'subscribed' }),
      });
      if (res.ok) {
        setNewsletterStatus('success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        setNewsletterError(data?.error?.message || __('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'));
        setNewsletterStatus('error');
      }
    } catch {
      setNewsletterError(__('Netzwerkfehler. Bitte prüfen Sie Ihre Verbindung.'));
      setNewsletterStatus('error');
    }
  };

  return (
    <footer className="bg-[#121416] text-[#b3b8bc] border-t border-slate-900 py-16 px-4 sm:px-6 lg:px-8 font-sans select-none relative z-10 overflow-hidden">
      {/* Premium Multi-Color Ambient Backdrop Glows */}
      <div className="absolute -bottom-32 -right-32 w-125 h-125 bg-[radial-gradient(circle,rgba(109,155,174,0.22)_0%,transparent_70%)] blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute -top-32 -left-32 w-100 h-100 bg-[radial-gradient(circle,rgba(146,159,93,0.18)_0%,transparent_70%)] blur-[100px] pointer-events-none animate-pulse duration-[6s]" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 pb-12 border-b border-slate-800/70">
          
          {/* COLUMN 1: Editorial Branding (Span 5) */}
          <div className="md:col-span-5 flex flex-col items-start">
            {/* Logo with clean silver-white filter */}
            <WpLink href={homeHref} className="hover:opacity-90 transition-opacity mb-6">
              <img 
                src={themeUri + "/Logo/hotelchecker24-logo_farbe.svg"} 
                alt="Hotelchecker24 Logo" 
                className="h-7 w-auto object-contain brightness-0 invert opacity-95" 
              />
            </WpLink>
            
            <p className="text-[#8e9499] text-sm font-sans font-normal leading-relaxed max-w-sm mb-6">
              {blogDescription}
            </p>

            {/* Language indicator & signal */}
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-800/40 border border-slate-800/60 px-3 py-1 rounded-md">
              <Globe className="w-3.5 h-3.5 text-[#929f5d]" />
              <span>{__('Sprachen: DE / EN')}</span>
            </div>
          </div>

          {/* COLUMN 2: Navigation Links (Span 3) */}
          <div className="md:col-span-3">
            <h4 className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-6">
              {__('Navigation')}
            </h4>
            <WpMenu 
              location="primary" 
              className="flex flex-col gap-3.5 text-sm font-semibold"
              linkClassName="hover:text-white hover:translate-x-0.5 transition-all duration-300"
            />
          </div>

          {/* COLUMN 3: Newsletter & Socials (Span 4) */}
          <div className="md:col-span-4 flex flex-col">
            <h4 className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-6">
              {__('Newsletter')}
            </h4>
            <p className="text-[#8e9499] text-sm leading-relaxed mb-4">
              {__('Abonnieren Sie exklusive Hotelempfehlungen und Reise-Inspirationen direkt in Ihr Postfach.')}
            </p>
            
            {/* Minimalist Newsletter Form */}
            {newsletterStatus === 'success' ? (
              <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 mb-6">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xs font-semibold text-primary">
                  {__('Danke! Sie erhalten in Kürze eine Bestätigungsmail.')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center w-full mb-2 relative">
                <div className="relative w-full flex items-center bg-[#1c1f22]/90 border border-slate-800 focus-within:border-primary/50 rounded-xl transition-all duration-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input 
                    type="email" 
                    required
                    placeholder={__('Ihre E-Mail-Adresse...')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={newsletterStatus === 'sending'}
                    className="w-full bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 py-3.5 pl-10 pr-12 font-medium disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={newsletterStatus === 'sending'}
                    className="absolute right-2 p-2 bg-primary hover:bg-primary/95 disabled:opacity-60 text-white rounded-lg transition-colors cursor-pointer"
                    aria-label={__('Abonnieren')}
                  >
                    {newsletterStatus === 'sending' ? (
                      <span className="w-3.5 h-3.5 block rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                </div>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p className="text-[10px] text-red-400 font-semibold mb-4">{newsletterError}</p>
            )}

            {/* Socials Connection Row */}
            <div className="flex items-center gap-3">
              {[
                { icon: <Instagram className="w-4 h-4" />, url: socialInstagram, label: "Instagram" },
                { icon: <Facebook className="w-4 h-4" />, url: socialFacebook, label: "Facebook" },
                { icon: <Twitter className="w-4 h-4" />, url: socialTwitter, label: "Twitter" },
              ].map((social, sIdx) => (
                <a 
                  key={sIdx} 
                  href={social.url} 
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-800 bg-[#1c1f22]/50 text-slate-400 hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer"
                >
                  {social.icon}
                </a>
              ))}
            </div>

          </div>

        </div>

        {/* MASSIVE BRUTALIST WATERMARK BANNER */}
        <div className="w-full text-center overflow-hidden py-6 sm:py-10 my-4 select-none pointer-events-none">
          <span 
            translate="no"
            className="notranslate text-[13vw] sm:text-[13vw] md:text-[13.5vw] lg:text-[14vw] xl:text-[172px] font-sans font-black tracking-tighter text-white/20 leading-none block select-none whitespace-nowrap"
          >
            Hotelchecker
            <span 
              translate="no"
              className="notranslate text-[0.5em] font-bold relative top-[-0.55em] ml-1 inline-block tracking-normal"
            >
              24
            </span>
          </span>
        </div>

        {/* BOTTOM METADATA BAR */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          <div>
            {footerText || `© ${new Date().getFullYear()} Hotelchecker24. ${__('Alle Rechte vorbehalten.')}`}
          </div>
        </div>

      </div>
    </footer>
  );
}
