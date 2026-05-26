import React from 'react';
import { Menu, X } from 'lucide-react';
import { WpMenu, useWpThemeUri, useWpI18n, useWpLanguage } from '../.forgewp/wordpress';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

export function Navbar() {
  const { __ } = useWpI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const themeUri = useWpThemeUri();

  // Simple unified, dynamic framework hook!
  const { currentLanguage, switchLanguage } = useWpLanguage();
  const isEnglish = currentLanguage === 'en';

  const handleLanguageToggle = (checked: boolean) => {
    switchLanguage(checked ? 'en' : 'de');
  };


  // Scroll listener to toggle sticky state styling
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`w-full bg-white select-none transition-all duration-700 ${
        isScrolled
          ? 'border-b border-slate-100/90 shadow-xs'
          : 'border-b border-transparent shadow-none'
      }`}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative'>
        {/* LEFT AREA: Menu (Desktop) / Switcher (Mobile) */}
        <div className='flex-1 flex items-center justify-start z-20'>
          <div className='hidden md:block'>
            <WpMenu
              location='primary'
              className='flex items-center gap-8 font-sans font-semibold text-xs uppercase tracking-wider text-slate-500'
              linkClassName='relative py-1 hover:text-primary transition-colors duration-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500 after:origin-left'
            />
          </div>
          {/* Mobile Flat Language Switcher using shadcn Switch */}
          <div
            className='md:hidden flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 border border-slate-100 rounded-full shadow-xs'
            translate='no'
          >
            <span
              className={`text-[10px] font-bold transition-colors duration-300 ${!isEnglish ? 'text-primary font-black' : 'text-slate-400'}`}
            >
              DE
            </span>
            <Switch
              checked={isEnglish}
              onCheckedChange={handleLanguageToggle}
              aria-label='Language switch (DE/EN)'
              className='scale-90'
            />
            <span
              className={`text-[10px] font-bold transition-colors duration-300 ${isEnglish ? 'text-primary font-black' : 'text-slate-400'}`}
            >
              EN
            </span>
          </div>
        </div>

        {/* CENTER: Centrally Placed Logo */}
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 shrink-0'>
          <a
            href='/'
            className='flex items-center justify-center hover:opacity-90 transition-opacity'
          >
            <img
              src={themeUri + '/Logo/hotelchecker24-logo_farbe.svg'}
              className='h-6 sm:h-8 w-auto object-contain max-w-[130px] sm:max-w-none'
              alt='Hotelchecker24 Logo'
            />
          </a>
        </div>

        {/* RIGHT AREA: Desktop Actions / Mobile Menu Button */}
        <div className='flex-1 flex items-center justify-end z-20'>
          {/* Desktop Right Actions */}
          <div className='hidden md:flex items-center gap-6'>
            {/* Desktop Language Switcher using shadcn Switch */}
            <div
              className='hidden md:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 border border-slate-100 rounded-full shadow-xs'
              translate='no'
            >
              <span
                className={`text-[10px] font-bold transition-colors duration-300 ${!isEnglish ? 'text-primary font-black' : 'text-slate-400'}`}
              >
                DE
              </span>
              <Switch
                checked={isEnglish}
                onCheckedChange={handleLanguageToggle}
                aria-label='Language switch (DE/EN)'
                className='scale-90'
              />
              <span
                className={`text-[10px] font-bold transition-colors duration-300 ${isEnglish ? 'text-primary font-black' : 'text-slate-400'}`}
              >
                EN
              </span>
            </div>

            {/* Premium "Get Listed" Button using shadcn Button */}
            <Button
              asChild
              className='relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-sans font-semibold text-sm px-6 py-2.5 rounded-full transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none'
            >
              <a href='/contact'>
                {/* Expand-from-bottom-center background layer */}
                <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-700 ease-out group-hover:w-[240px] group-hover:h-[240px] group-hover:bottom-[-90px] z-0' />
                <span className='relative z-10'>{__('Eintragen lassen')}</span>
              </a>
            </Button>
          </div>

          {/* Mobile Right: Menu Icon Button */}
          <div className='md:hidden flex items-center'>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='p-2 rounded-lg hover:bg-slate-50 text-slate-600 focus:outline-none transition-colors cursor-pointer'
              aria-label='Toggle Menu'
            >
              {mobileMenuOpen ? (
                <X className='w-6 h-6 text-slate-600' />
              ) : (
                <Menu className='w-6 h-6 text-slate-600' />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-slate-100 bg-white/98 py-6 px-6 animate-in slide-in-from-top-5 duration-200'>
          <div className='flex flex-col gap-5 font-sans font-semibold text-base text-slate-700'>
            {/* Dynamic Menu items mapped for mobile */}
            <WpMenu
              location='primary'
              className='flex flex-col gap-4'
              linkClassName='py-2 hover:text-primary transition-colors'
            />

            {/* Mobile Get Listed Button using shadcn Button */}
            <Button
              asChild
              className='mt-6 relative overflow-hidden flex items-center justify-center border border-primary text-primary font-semibold py-6 rounded-xl hover:text-white transition-colors duration-500 group bg-transparent hover:bg-transparent shadow-none'
            >
              <a href='/contact'>
                {/* Expanding background for mobile */}
                <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-700 ease-out group-hover:w-[400px] group-hover:h-[400px] group-hover:bottom-[-150px] z-0' />
                <span className='relative z-10'>{__('Eintragen lassen')}</span>
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
