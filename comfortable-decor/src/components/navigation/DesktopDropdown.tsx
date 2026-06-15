import { ChevronRight, ArrowRight } from 'lucide-react';

interface SubmenuData {
  title: string;
  collections: {
    name: string;
    items: string[];
  }[];
  featured: {
    title: string;
    description: string;
    image: string;
    tag: string;
  };
}

interface DesktopDropdownProps {
  activeMenu: string | null;
  categoryData: SubmenuData | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function DesktopDropdown({
  activeMenu,
  categoryData,
  onMouseEnter,
  onMouseLeave,
}: DesktopDropdownProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed inset-x-0 bg-white/95 backdrop-blur-2xl transition-all duration-500 ease-out border-b border-zinc-100 z-40 overflow-hidden shadow-2xl flex flex-col justify-start ${
        activeMenu
          ? 'top-[73px] opacity-100 h-[calc(100vh-73px)] pointer-events-auto'
          : 'top-[65px] opacity-0 h-0 pointer-events-none'
      }`}
    >
      {categoryData && (
        <div className='flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-12 md:py-10 grid grid-cols-12 gap-8 md:gap-12 overflow-y-auto animate-in fade-in-20 duration-300'>
          {/* Left Column: Submenu Links (7 cols) */}
          <div className='col-span-12 md:col-span-7 grid grid-cols-2 gap-8 md:gap-12 pr-0 md:pr-12'>
            {categoryData.collections.map((col, idx) => (
              <div
                key={idx}
                className='flex flex-col gap-5'
              >
                <span className='font-heading font-extrabold text-xs uppercase tracking-widest text-zinc-400'>
                  {col.name}
                </span>
                <ul className='flex flex-col gap-3.5'>
                  {col.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <a
                        href={`#${item.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                        className='group flex items-center justify-between text-sm md:text-base font-medium text-zinc-600 hover:text-brand transition-colors duration-300'
                      >
                        <span>{item}</span>
                        <ChevronRight className='w-3.5 h-3.5 text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all duration-300' />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right Column: Featured Visual (5 cols) */}
          <div className='col-span-12 md:col-span-5 h-full flex flex-col justify-between border-l border-zinc-100 pl-0 md:pl-12'>
            <div className='flex flex-col gap-4'>
              <span className='inline-block bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full w-fit'>
                {categoryData.featured.tag}
              </span>
              <h3 className='font-heading font-black text-2xl uppercase tracking-tight text-zinc-900 leading-tight'>
                {categoryData.featured.title}
              </h3>
              <p className='text-zinc-500 text-sm leading-relaxed max-w-sm'>
                {categoryData.featured.description}
              </p>
            </div>

            <div className='relative aspect-16/10 rounded-2xl overflow-hidden mt-6 shadow-md border border-zinc-100 group select-none'>
              <img
                src={categoryData.featured.image}
                alt={categoryData.featured.title}
                className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105'
              />
              <div className='absolute inset-0 bg-linear-to-t from-zinc-950/25 to-transparent' />

              <a
                href='#shop'
                className='absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs text-zinc-900 hover:bg-brand hover:text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all duration-300'
              >
                Shop Collection
                <ArrowRight className='w-3.5 h-3.5' />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
