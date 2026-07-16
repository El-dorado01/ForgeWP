import React from 'react';
import { useWpLocation, useWpTerms, useWpI18n, useWpPagePath } from '../.forgewp/wordpress';
import { Search, Navigation, MapPin, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

export interface HeroSearchBoardProps {
  searchPlaceholder?: string;
}

/**
 * Hydration island (useState/useEffect + useWpLocation/useWpTerms) — the
 * hero's search form, category/country dropdowns, and quick-tag shortcuts.
 *
 * Split out of HeroSection for the same reason as HeroSpotlight: keeps the
 * hero's own padding-bearing outer <section> fully static so nothing ever
 * re-renders (and clobbers) its server-computed padding classes. Returns a
 * fragment (form + tags as siblings) rather than a single wrapping element —
 * the hydration boundary div that mounts this component supplies its own
 * wrapper, so an extra one here isn't needed.
 */
export function HeroSearchBoard({ searchPlaceholder }: HeroSearchBoardProps) {
  const { __ } = useWpI18n();
  const [, setLocation] = useWpLocation();
  const hotelsPath = useWpPagePath('hotels-page', '/hotels');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState('');
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [countryOpen, setCountryOpen] = React.useState(false);

  const categoryRef = React.useRef<HTMLDivElement>(null);
  const countryRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
      }
      if (
        countryRef.current &&
        !countryRef.current.contains(event.target as Node)
      ) {
        setCountryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load taxonomy terms dynamically from WP REST API (or mock data in dev)
  const { terms: categoryTerms } = useWpTerms('category');
  const { terms: countryTerms } = useWpTerms('country');

  // Build dropdown options — always include an "all" entry first
  const categories = [
    { value: '', label: __('Kategorie (Alle)') },
    ...categoryTerms.map((t) => ({ value: t.slug, label: t.name })),
  ];
  const countries = [
    { value: '', label: __('Land (Alle)') },
    ...countryTerms.map((t) => ({
      value: t.slug,
      label: `${t.meta?.flag ?? '🌍'} ${t.name}`,
    })),
  ];

  const isSearchDisabled =
    !searchTerm.trim() && !selectedCategory && !selectedCountry;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSearchDisabled) return;
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('q', searchTerm.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedCountry) params.append('country', selectedCountry);
    setLocation(`${hotelsPath}?${params.toString()}`);
  };

  return (
    <>
      {/* Search Card (Spacious, well-spaced editorial board) */}
      <form
        onSubmit={handleSearchSubmit}
        className='w-full bg-white border border-slate-100/95 shadow-xl shadow-slate-200/30 p-2 rounded-3xl sm:rounded-full grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-center mb-8'
      >
        {/* SEARCH INPUT */}
        <div className='sm:col-span-5 relative flex items-center h-12 px-4 border border-slate-100 sm:border-0 sm:border-r sm:border-slate-100 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus-within:border-primary/60 sm:focus-within:border-transparent transition-colors'>
          <Search className='w-4 h-4 text-slate-400 shrink-0 mr-3' />
          <input
            type='text'
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full h-full text-slate-800 text-sm font-medium bg-transparent focus:outline-none placeholder-slate-400'
          />
        </div>

        {/* CATEGORY FILTER (dynamic from WP taxonomy) */}
        <div
          className='sm:col-span-3 relative'
          ref={categoryRef}
        >
          <button
            type='button'
            onClick={() => {
              setCategoryOpen(!categoryOpen);
              setCountryOpen(false);
            }}
            className='w-full flex items-center justify-between h-12 px-4 border border-slate-100 sm:border-0 sm:border-r sm:border-slate-100 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus:outline-none focus:border-primary/60 sm:focus:border-transparent transition-colors text-slate-700 text-xs font-bold bg-transparent cursor-pointer'
          >
            <div className='flex items-center gap-2'>
              <Navigation className='w-3.5 h-3.5 text-slate-400 shrink-0' />
              <span className='whitespace-nowrap overflow-hidden text-ellipsis max-w-25 sm:max-w-none'>
                {selectedCategory
                  ? categories.find((c) => c.value === selectedCategory)
                      ?.label
                  : __('Kategorie (Alle)')}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {categoryOpen && (
            <div className='absolute left-0 mt-2 w-48 bg-white border border-slate-100/90 rounded-2xl shadow-xl p-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150'>
              {categories.map((c) => (
                <button
                  key={c.value}
                  type='button'
                  onClick={() => {
                    setSelectedCategory(c.value);
                    setCategoryOpen(false);
                  }}
                  className='w-full text-left text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-primary rounded-xl cursor-pointer p-2.5 transition-colors focus:bg-slate-50 focus:text-primary outline-none block'
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COUNTRY FILTER (dynamic from WP taxonomy) */}
        <div
          className='sm:col-span-2 relative'
          ref={countryRef}
        >
          <button
            type='button'
            onClick={() => {
              setCountryOpen(!countryOpen);
              setCategoryOpen(false);
            }}
            className='w-full flex items-center justify-between h-12 px-4 border border-slate-100 sm:border-0 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus:outline-none focus:border-primary/60 sm:focus:border-transparent transition-colors text-slate-700 text-xs font-bold bg-transparent cursor-pointer'
          >
            <div className='flex items-center gap-2'>
              <MapPin className='w-3.5 h-3.5 text-slate-400 shrink-0' />
              <span className='whitespace-nowrap overflow-hidden text-ellipsis max-w-17.5 sm:max-w-none'>
                {selectedCountry
                  ? (() => {
                      const found = countries.find(
                        (c) => c.value === selectedCountry,
                      );
                      if (!found) return __('Land');
                      const parts = found.label.split(' ');
                      return parts.length > 1
                        ? parts.slice(1).join(' ')
                        : found.label;
                    })()
                  : __('Land')}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${countryOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {countryOpen && (
            <div className='absolute left-0 mt-2 w-40 bg-white border border-slate-100/90 rounded-2xl shadow-xl p-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150'>
              {countries.map((c) => (
                <button
                  key={c.value}
                  type='button'
                  onClick={() => {
                    setSelectedCountry(c.value);
                    setCountryOpen(false);
                  }}
                  className='w-full text-left text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-primary rounded-xl cursor-pointer p-2.5 transition-colors focus:bg-slate-50 focus:text-primary outline-none block'
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <div className='sm:col-span-2 px-1'>
          <Button
            type='submit'
            disabled={isSearchDisabled}
            className='w-full h-12 bg-primary hover:bg-primary/95 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-2xl sm:rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all duration-300 transform active:scale-95 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
          >
            <span>{__('Suchen')}</span>
            <ArrowRight className='w-4 h-4 text-white group-hover:text-white transition-all duration-300 group-hover:translate-x-1' />
          </Button>
        </div>
      </form>

      {/* Quick Tags — derived from real category terms; the fallback list only ever
          shows when no categories exist yet, so it's a hardcoded constant rather than
          an editable field (editing it wouldn't do anything once real categories exist,
          which would be confusing in the block inspector). */}
      <div className='flex flex-wrap items-center justify-center w-full gap-2'>
        <span className='text-xs font-bold uppercase tracking-wider text-slate-400 mr-2'>
          {__('Trending:')}
        </span>
        {(categoryTerms.length > 0
          ? categoryTerms.slice(0, 5).map((t) => t.name)
          : [__('Wellness'), __('Boutique'), __('Alpin'), __('Luxus'), __('Design')]
        ).map((tag) => (
          <button
            key={tag}
            type='button'
            onClick={() => {
              const term = categoryTerms.find(
                (t) => t.name === tag || t.slug === tag.toLowerCase(),
              );
              setSelectedCategory(term ? term.slug : tag.toLowerCase());
            }}
            className='text-xs font-semibold text-slate-500 hover:text-primary hover:border-primary/40 border border-slate-200 bg-white py-1.5 px-3.5 rounded-full cursor-pointer transition-all duration-300'
          >
            #{tag}
          </button>
        ))}
      </div>
    </>
  );
}

export default HeroSearchBoard;
