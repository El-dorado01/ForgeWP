import { Phone, Mail, Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";
import { useWpOption } from '@forgewp/react';

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

export function MiniHeader() {
  // Dynamic admin-controllable options via useWpOption
  const phone = useWpOption("contact_phone", "+43 1 234 5678");
  const email = useWpOption("contact_email", "office@hotelchecker24.com");
  const facebookUrl = useWpOption("social_facebook", "");
  const instagramUrl = useWpOption("social_instagram", "");
  const twitterUrl = useWpOption("social_twitter", "");
  const youtubeUrl = useWpOption("social_youtube", "");
  const tiktokUrl = useWpOption("social_tiktok", "");
  const linkedinUrl = useWpOption("social_linkedin", "");
  const pinterestUrl = useWpOption("social_pinterest", "");

  const socials = [
    { icon: <Facebook className="w-4 h-4" />, url: facebookUrl, label: "Facebook" },
    { icon: <Instagram className="w-4 h-4" />, url: instagramUrl, label: "Instagram" },
    { icon: <Twitter className="w-4 h-4" />, url: twitterUrl, label: "Twitter" },
    { icon: <Youtube className="w-4 h-4" />, url: youtubeUrl, label: "YouTube" },
    { icon: <TiktokIcon className="w-4 h-4" />, url: tiktokUrl, label: "TikTok" },
    { icon: <Linkedin className="w-4 h-4" />, url: linkedinUrl, label: "LinkedIn" },
    { icon: <PinterestIcon className="w-4 h-4" />, url: pinterestUrl, label: "Pinterest" },
  ].filter(social => social.url && social.url.trim() !== "");

  return (
    <div className="w-full bg-slate-50 text-slate-500 text-[10px] sm:text-xs py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-100/80 relative z-40 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
        
        {/* Contact Details */}
        <div className="flex items-center gap-5">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors duration-300">
              <Phone className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium whitespace-nowrap">{phone}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="hidden sm:flex items-center gap-1.5 hover:text-slate-800 transition-colors duration-300">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium whitespace-nowrap">{email}</span>
            </a>
          )}
        </div>

        {/* Social Media Links */}
        <div className="flex items-center justify-center gap-4">
          {socials.map((social, sIdx) => (
            <a 
              key={sIdx} 
              href={social.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-slate-800 transition-colors duration-300" 
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
