import { useWpLocation, useWpTerms, useWpI18n, useWpMeta, useWpQuery, WpLink, useWpPagePath } from '../.forgewp/wordpress';
import {
  Search,
  MapPin,
  Navigation,
  ArrowRight,
  Star,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/button';

export function HeroSection() {
  const { __ } = useWpI18n();
  const [, setLocation] = useWpLocation();
  const hotelsPath = useWpPagePath('hotels-page', '/hotels');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState('');

  // Dynamically resolve the spotlight hotel ID set by the admin on the homepage
  const hotelOfTheMonthId = useWpMeta('hotel_of_the_month', '6'); // default to ID 6 (Villa d'Este)

  const { posts: hotels } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 100,
  });

  const spotlight = React.useMemo(() => {
    if (!hotels || hotels.length === 0) return null;

    let targetId = hotelOfTheMonthId;
    if (Array.isArray(targetId)) {
      const firstVal = targetId[0];
      targetId = typeof firstVal === 'object' && firstVal !== null ? (firstVal.ID || firstVal.id) : firstVal;
    } else if (typeof targetId === 'string' && targetId.trim()) {
      try {
        const parsed = JSON.parse(targetId);
        if (Array.isArray(parsed)) {
          const firstVal = parsed[0];
          targetId = typeof firstVal === 'object' && firstVal !== null ? (firstVal.ID || firstVal.id) : firstVal;
        }
      } catch (e) {}
      if (String(targetId).includes(',')) {
        targetId = String(targetId).split(',')[0].trim();
      }
    }

    const found = hotels.find((h) => String(h.id) === String(targetId));
    return found || hotels[0];
  }, [hotels, hotelOfTheMonthId]);

  const spotlightTitle = spotlight ? spotlight.title : "Villa d'Este";
  const spotlightRating = spotlight ? String(spotlight.customFields?.rating || '4.9') : '4.9';
  const spotlightCity = spotlight ? String(spotlight.customFields?.city || spotlight.customFields?.location || '') : 'Comer See';
  const spotlightCountry = spotlight ? (spotlight as any)._terms?.country?.[0]?.name || 'Italien' : 'Italien';
  const spotlightImage = spotlight ? (typeof spotlight.featuredImage === 'object' && spotlight.featuredImage !== null ? (spotlight.featuredImage as any).url : String(spotlight.featuredImage)) : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';
  const spotlightLink = spotlight ? (spotlight.permalink || `/hotel/${spotlight.id}`) : '#';

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
    if (searchTerm.trim()) params.append('s', searchTerm.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedCountry) params.append('country', selectedCountry);
    setLocation(`${hotelsPath}?${params.toString()}`);
  };

  return (
    <section className='relative w-full overflow-hidden bg-slate-50 selection:bg-primary selection:text-white py-12 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8'>
      {/* Editorial Steel Blue & Accent Blob Gradients */}
      <div className='absolute top-0 right-0 w-150 h-150 bg-[radial-gradient(circle,rgba(109,155,174,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />
      <div className='absolute bottom-0 left-0 w-125 h-125 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />

      <div className='relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10'>
        {/* LEFT COLUMN: Editorial Copy & Search Board (Column Span 7) */}
        <div className='lg:col-span-7 flex flex-col items-start text-left'>
          {/* Heading */}
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-slate-800 leading-[1.1] mb-6 uppercase'>
            {__('Handverlesene')} <br />
            <span className='bg-linear-to-r from-primary via-slate-700 to-accent bg-clip-text text-transparent'>
              {__('Boutique- & Luxushotels')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className='text-slate-500 text-base sm:text-lg max-w-2xl mb-10 font-sans font-normal leading-relaxed'>
            {__(
              'Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.',
            )}
          </p>

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
                placeholder={__('Hotelname oder Stadt suchen...')}
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
                className='w-full bg-primary hover:bg-primary/95 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-2xl sm:rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all duration-300 transform active:scale-95 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
              >
                <span>{__('Suchen')}</span>
                <ArrowRight className='w-4 h-4 text-white group-hover:text-white transition-all duration-300 group-hover:translate-x-1' />
              </Button>
            </div>
          </form>

          {/* Quick Tags — derived from category terms */}
          <div className='flex flex-wrap items-center justify-center w-full gap-2'>
            <span className='text-xs font-bold uppercase tracking-wider text-slate-400 mr-2'>
              {__('Trending:')}
            </span>
            {(categoryTerms.length > 0
              ? categoryTerms.slice(0, 5).map((t) => t.name)
              : [
                  __('Wellness'),
                  __('Boutique'),
                  __('Alpin'),
                  __('Luxus'),
                  __('Design'),
                ]
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
        </div>

        {/* RIGHT COLUMN: Premium Magazine Splash Image & Float Card (Column Span 5) */}
        <WpLink
          href={spotlightLink}
          className='lg:col-span-5 flex items-center justify-center relative w-full mt-8 lg:mt-0 cursor-pointer group'
        >
          <div className='relative w-full aspect-4/5 sm:max-w-md lg:max-w-none rounded-[40px] overflow-hidden border border-slate-200/60 shadow-2xl'>
            {/* Curated Luxury Hotel Image */}
            <img
              src={spotlightImage}
              alt={spotlightTitle}
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out'
            />

            {/* Gradient Overlay for visual depth */}
            <div className='absolute inset-0 bg-linear-to-t from-slate-900/65 via-slate-900/10 to-transparent pointer-events-none' />

            {/* Float Card Overlay (Spotlight Destination) */}
            <div className='absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-xl flex items-center justify-between transition-all duration-300 group-hover:bg-white'>
              <div>
                <span className='text-[10px] font-bold uppercase tracking-wider text-[#929f5d] bg-[#929f5d]/10 px-2.5 py-0.5 rounded-md mb-1.5 inline-block'>
                  {__('Hotel des Monats')}
                </span>
                <h4 className='font-sans font-black text-slate-800 text-lg leading-tight'>
                  {spotlightTitle}
                </h4>
                <p className='text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-0.5'>
                  <MapPin className='w-3.5 h-3.5 text-primary' />
                  {spotlightCity}{spotlightCountry ? `, ${spotlightCountry}` : ''}
                </p>
              </div>

              <div className='flex flex-col items-end shrink-0'>
                <span className='text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-xs'>
                  <Star className='w-3.5 h-3.5 text-accent fill-accent' />
                  {spotlightRating}
                </span>
                <span className='text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider'>
                  {__('Hervorragend')}
                </span>
              </div>
            </div>
          </div>
        </WpLink>
      </div>
    </section>
  );
}
