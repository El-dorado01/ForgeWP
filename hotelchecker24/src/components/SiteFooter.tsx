import React from "react";
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Mail, 
  ArrowRight,
  Globe
} from "lucide-react";
import { WpMenu, useWpOption, useWpThemeMod, useWpThemeUri, useWpI18n } from "../.forgewp/wordpress";

export default function SiteFooter() {
  const { __ } = useWpI18n();
  const [email, setEmail] = React.useState("");
  const themeUri = useWpThemeUri();

  // Retrieve dynamic site branding options
  const blogDescription = useWpOption(
    "blogdescription",
    "Hotelchecker24 ist Ihre unabhängige, bilinguale Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa."
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(__("Danke für Ihr Abonnement!"));
      setEmail("");
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
            <a href="/" className="hover:opacity-90 transition-opacity mb-6">
              <img 
                src={themeUri + "/Logo/hotelchecker24-logo_farbe.svg"} 
                alt="Hotelchecker24 Logo" 
                className="h-7 w-auto object-contain brightness-0 invert opacity-95" 
              />
            </a>
            
            <p className="text-[#8e9499] text-sm font-sans font-normal leading-relaxed max-w-sm mb-6">
              {blogDescription}
            </p>

            {/* Language indicator & signal */}
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-800/40 border border-slate-800/60 px-3 py-1 rounded-md">
              <Globe className="w-3.5 h-3.5 text-[#929f5d]" />
              <span>{__('Edition: DE / EN')}</span>
            </div>
          </div>

          {/* COLUMN 2: Navigation Links (Span 3) */}
          <div className="md:col-span-3">
            <h4 className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-6">
              Navigation
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
            <form onSubmit={handleSubscribe} className="flex items-center w-full mb-6 relative">
              <div className="relative w-full flex items-center bg-[#1c1f22]/90 border border-slate-800 focus-within:border-primary/50 rounded-xl transition-all duration-300">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input 
                  type="email" 
                  required
                  placeholder={__('Ihre E-Mail-Adresse...')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 py-3.5 pl-10 pr-12 font-medium"
                />
                <button 
                  type="submit"
                  className="absolute right-2 p-2 bg-primary hover:bg-primary/95 text-white rounded-lg transition-colors cursor-pointer"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </form>

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
            {footerText}
          </div>
          <div className="flex items-center gap-1">
            <span>{__('Powered by')}</span>
            <span className="text-white hover:text-primary transition-colors cursor-pointer">ForgeWP Framework</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
