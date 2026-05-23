import { Phone, Mail, Facebook, Instagram, Twitter } from "lucide-react";
import { useWpOption } from "../.forgewp/wordpress";

export function MiniHeader() {
  // Dynamic admin-controllable options via useWpOption
  const phone = useWpOption("contact_phone", "+43 1 234 5678");
  const email = useWpOption("contact_email", "office@hotelchecker24.com");
  const facebookUrl = useWpOption("social_facebook", "https://facebook.com/hotelchecker24");
  const instagramUrl = useWpOption("social_instagram", "https://instagram.com/hotelchecker24");
  const twitterUrl = useWpOption("social_twitter", "https://twitter.com/hotelchecker24");

  return (
    <div className="w-full bg-slate-50 text-slate-500 text-xs py-2 px-4 sm:px-6 lg:px-8 border-b border-slate-100/80 relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Contact Details */}
        <div className="flex items-center gap-5">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors duration-300">
              <Phone className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium">{phone}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-slate-800 transition-colors duration-300">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{email}</span>
            </a>
          )}
        </div>

        {/* Social Media Links */}
        <div className="flex items-center gap-4">
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors duration-300" aria-label="Facebook">
              <Facebook className="w-4 h-4" />
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors duration-300" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {twitterUrl && (
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors duration-300" aria-label="Twitter">
              <Twitter className="w-4 h-4" />
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
