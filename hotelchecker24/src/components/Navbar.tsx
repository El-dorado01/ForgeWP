import React from "react";
import { WpMenu } from "../.forgewp/wordpress";
import { Button } from "./ui/button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Scroll listener to toggle sticky state styling
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`w-full bg-white select-none transition-all duration-700 ${
        isScrolled 
          ? "border-b border-slate-100/90 shadow-xs" 
          : "border-b border-transparent shadow-none"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
        
        {/* LEFT: Dynamic Navigation Menu */}
        <div className="hidden md:flex items-center flex-1 justify-start">
          <WpMenu 
            location="primary" 
            className="flex items-center gap-8 font-sans font-semibold text-xs uppercase tracking-wider text-slate-500"
            linkClassName="relative py-1 hover:text-primary transition-colors duration-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500 after:origin-left"
          />
        </div>

        {/* CENTER: Centrally Placed Logo */}
        <div className="flex items-center justify-center shrink-0 z-10">
          <a href="/" className="flex items-center justify-center hover:opacity-90 transition-opacity">
            <img 
              src="/Logo/hotelchecker24-logo_farbe.svg" 
              className="h-7 sm:h-8 w-auto object-contain" 
              alt="Hotelchecker24 Logo" 
            />
          </a>
        </div>

        {/* RIGHT: Actions (Flat Language Switcher & Smooth spread CTA Button) */}
        <div className="hidden md:flex items-center flex-1 justify-end gap-6">
          
          {/* Flat Language Switcher (Plugin Ready) */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-100 rounded-full shadow-xs">
            <button
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full bg-primary text-white shadow-xs transition-colors duration-300"
            >
              DE
            </button>
            <button
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full text-slate-400 hover:text-slate-600 transition-colors duration-300"
            >
              EN
            </button>
          </div>

          {/* Premium "Get Listed" Button using shadcn Button */}
          <Button
            asChild
            className="relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-sans font-semibold text-sm px-6 py-2.5 rounded-full transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none"
          >
            <a href="/contact">
              {/* Expand-from-bottom-center background layer */}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-700 ease-out group-hover:w-[240px] group-hover:h-[240px] group-hover:bottom-[-90px] z-0" />
              <span className="relative z-10">Get Listed</span>
            </a>
          </Button>

        </div>

        {/* MOBILE NAVIGATION BUTTONS */}
        <div className="flex items-center gap-4 md:hidden">
          
          {/* Mobile Flat Language Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 border border-slate-100 rounded-full shadow-xs">
            <button className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-primary text-white">
              DE
            </button>
            <button className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full text-slate-400">
              EN
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 focus:outline-none"
            aria-label="Toggle Menu"
          >
            <span className="font-bold text-sm">{mobileMenuOpen ? "CLOSE" : "MENU"}</span>
          </button>
        </div>

      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/98 py-6 px-6 animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-5 font-sans font-semibold text-base text-slate-700">
            
            {/* Dynamic Menu items mapped for mobile */}
            <WpMenu 
              location="primary" 
              className="flex flex-col gap-4"
              linkClassName="py-2 hover:text-primary transition-colors"
            />

            {/* Mobile Get Listed Button using shadcn Button */}
            <Button
              asChild
              className="mt-6 relative overflow-hidden flex items-center justify-center border border-primary text-primary font-semibold py-6 rounded-xl hover:text-white transition-colors duration-500 group bg-transparent hover:bg-transparent shadow-none"
            >
              <a href="/contact">
                {/* Expanding background for mobile */}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-700 ease-out group-hover:w-[400px] group-hover:h-[400px] group-hover:bottom-[-150px] z-0" />
                <span className="relative z-10">Get Listed</span>
              </a>
            </Button>

          </div>
        </div>
      )}
    </header>
  );
}
