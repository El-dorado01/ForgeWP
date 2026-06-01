import React from 'react';
import { useWpSearch, useWpLocation, useWpI18n, useWpTerms } from '../.forgewp/wordpress';
import { Search, SlidersHorizontal, MapPin, Tag } from 'lucide-react';
import { HotelsGrid } from './HotelsGrid';
import { Hydrate } from '@forgewp/react';

export function HotelsWorkspace() {
  const { __ } = useWpI18n();
  const searchString = useWpSearch();
  const [, setLocation] = useWpLocation();
  const params = React.useMemo(() => new URLSearchParams(searchString), [searchString]);

  const keyword = params.get('q') || params.get('s') || '';
  const country = params.get('country') || '';
  const category = params.get('category') || '';

  const [searchInput, setSearchInput] = React.useState(keyword);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Sync keyword changes into the searchInput state when filters are cleared/updated
  React.useEffect(() => {
    setSearchInput(keyword);
  }, [keyword]);

  // Collect unique countries and categories directly from WordPress taxonomy terms
  const { terms: countryTerms } = useWpTerms('country');
  const { terms: categoryTerms } = useWpTerms('category');

  const countries = React.useMemo(() => {
    return countryTerms.map((t) => ({ slug: t.slug, name: t.name }));
  }, [countryTerms]);

  const categories = React.useMemo(() => {
    return categoryTerms.map((t) => ({ slug: t.slug, name: t.name }));
  }, [categoryTerms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchString);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.delete('s');
    const qs = newParams.toString();
    setLocation(qs ? `/hotels?${qs}` : '/hotels');
  };

  const setFilter = (key: 'country' | 'category', value: string) => {
    const newParams = new URLSearchParams(searchString);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    const qs = newParams.toString();
    setLocation(qs ? `/hotels?${qs}` : '/hotels');
  };

  return (
    <div className='space-y-8'>
      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className='flex gap-2 max-w-xl'
      >
        <div className='relative flex-1'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <input
            type='text'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={__('Hotel suchen…')}
            className='w-full bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-all'
          />
        </div>
        <button
          type='submit'
          className='bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-xs'
        >
          {__('Suchen')}
        </button>
      </form>

      {/* Main Content & Mobile Toggle */}
      <div className='py-2'>
        {/* Mobile Filter Toggle Button */}
        <div className='lg:hidden flex items-center justify-between gap-4 mb-6'>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className='flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer'
          >
            <SlidersHorizontal className='w-4 h-4 text-primary' />
            {filtersOpen ? __('Filter ausblenden') : __('Filter einblenden')}
          </button>
          {(country || category) && (
            <button
              onClick={() => {
                setFilter('country', '');
                setFilter('category', '');
              }}
              className='text-xs font-semibold text-primary hover:text-primary/80 transition-colors'
            >
              {__('Filter zurücksetzen')}
            </button>
          )}
        </div>

        <div className='flex flex-col lg:flex-row gap-8'>
          {/* Sidebar Filters */}
          <aside
            className={`lg:w-60 shrink-0 space-y-5 ${filtersOpen ? 'block' : 'hidden'} lg:block`}
          >
            <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-xs'>
              <div className='flex items-center gap-2 mb-4 pb-3 border-b border-slate-100'>
                <SlidersHorizontal className='w-4 h-4 text-primary' />
                <span className='text-sm font-bold text-slate-700'>
                  {__('Filter')}
                </span>
              </div>

              {/* Country filter */}
              {countries.length > 0 && (
                <div className='mb-5'>
                  <div className='flex items-center gap-1.5 mb-2'>
                    <MapPin className='w-3.5 h-3.5 text-slate-400' />
                    <span className='text-xs font-semibold text-slate-500'>
                      {__('Land')}
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <button
                      onClick={() => setFilter('country', '')}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${!country ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {__('Alle Länder')}
                    </button>
                    {countries.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => setFilter('country', c.slug)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${country === c.slug ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category filter */}
              {categories.length > 0 && (
                <div>
                  <div className='flex items-center gap-1.5 mb-2'>
                    <Tag className='w-3.5 h-3.5 text-slate-400' />
                    <span className='text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400'>
                      {__('Kategorie')}
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <button
                      onClick={() => setFilter('category', '')}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${!category ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {__('Alle Kategorien')}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => setFilter('category', c.slug)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${category === c.slug ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className='flex-1 min-w-0'>
            <Hydrate trigger='load'>
              <HotelsGrid />
            </Hydrate>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelsWorkspace;
