import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Globe,
  Youtube,
  Linkedin
} from "lucide-react";
import { WpMenu, useWpOption, useWpThemeMod, useWpThemeUri, useWpI18n, useWpLanguage, useWpPageLink, WpLink } from '@forgewp/react';

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

export default function SiteFooter() {
  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;
  const themeUri = useWpThemeUri();
  const impressumHref = useWpPageLink('impressum-page', '/impressum');

  // Retrieve dynamic site branding options
  const blogDescription = useWpOption(
    "blogdescription",
    "Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa."
  );

  // Retrieve dynamic social media options
  const socialFacebook = useWpOption("social_facebook", "");
  const socialInstagram = useWpOption("social_instagram", "");
  const socialTwitter = useWpOption("social_twitter", "");
  const socialYoutube = useWpOption("social_youtube", "");
  const socialTiktok = useWpOption("social_tiktok", "");
  const socialLinkedin = useWpOption("social_linkedin", "");
  const socialPinterest = useWpOption("social_pinterest", "");

  const socialList = [
    { icon: <Instagram className="w-4 h-4" />, url: socialInstagram, label: "Instagram" },
    { icon: <Facebook className="w-4 h-4" />, url: socialFacebook, label: "Facebook" },
    { icon: <Twitter className="w-4 h-4" />, url: socialTwitter, label: "Twitter" },
    { icon: <Youtube className="w-4 h-4" />, url: socialYoutube, label: "YouTube" },
    { icon: <TiktokIcon className="w-4 h-4" />, url: socialTiktok, label: "TikTok" },
    { icon: <Linkedin className="w-4 h-4" />, url: socialLinkedin, label: "LinkedIn" },
    { icon: <PinterestIcon className="w-4 h-4" />, url: socialPinterest, label: "Pinterest" },
  ].filter(social => social.url && social.url.trim() !== "");

  // Retrieve dynamic theme customization options
  const footerText = useWpThemeMod(
    "footer_text",
    `© ${new Date().getFullYear()} Hotelchecker24. All rights reserved.`
  );

  return (
    <footer className="bg-[#121416] text-[#b3b8bc] border-t border-slate-900 py-16 px-4 sm:px-6 lg:px-8 font-sans select-none relative z-10 overflow-hidden">
      {/* Premium Multi-Color Ambient Backdrop Glows */}
      <div className="absolute -bottom-32 -right-32 w-125 h-125 bg-[radial-gradient(circle,rgba(109,155,174,0.22)_0%,transparent_70%)] blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute -top-32 -left-32 w-100 h-100 bg-[radial-gradient(circle,rgba(146,159,93,0.18)_0%,transparent_70%)] blur-[100px] pointer-events-none animate-pulse duration-[6s]" />
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 md:gap-8 pb-12 border-b border-slate-800/70 justify-between items-start">
          
          {/* COLUMN 1: Editorial Branding */}
          <div className="flex-1 min-w-[280px] max-w-md flex flex-col items-start">
            {/* Logo with clean silver-white filter */}
            <WpLink href={homeHref} className="hover:opacity-90 transition-opacity mb-6">
              <img
                src={themeUri + "/Logo/hotelchecker24-logo_farbe.svg"}
                alt="Hotelchecker24 Logo"
                loading="lazy"
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
 
          {/* COLUMN 2: Navigation Links */}
          <div className="flex-1 min-w-[200px] max-w-xs md:pl-8">
            <h4 className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-6">
              {__('Navigation')}
            </h4>
            <WpMenu 
              location="primary" 
              className="flex flex-col gap-3.5 text-sm font-semibold"
              linkClassName="hover:text-white hover:translate-x-0.5 transition-all duration-300"
            />
          </div>
 
          {/* COLUMN 3: Socials & Community */}
          {socialList.length > 0 && (
            <div data-forgewp-hide-empty-socials="" className="flex-1 min-w-[280px] max-w-sm flex flex-col">
              <h4 className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-6">
                {__('Social Media')}
              </h4>
              <p className="text-[#8e9499] text-sm leading-relaxed mb-6">
                {__('Folgen Sie uns auf unseren Social-Media-Kanälen für tägliche Hotelempfehlungen und exklusive Reiseberichte.')}
              </p>
              
              {/* Socials Connection Row */}
              <div className="flex items-center gap-3">
                {socialList.map((social, sIdx) => (
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
          )}
 
        </div>

        {/* BOTTOM METADATA BAR */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          <div>
            {footerText || `© ${new Date().getFullYear()} Hotelchecker24. ${__('Alle Rechte vorbehalten.')}`}
          </div>
          <div className="flex items-center gap-6">
            <WpLink href={impressumHref} className="hover:text-white transition-colors">
              {__('Impressum')}
            </WpLink>
          </div>
        </div>

      </div>
    </footer>
  );
}
