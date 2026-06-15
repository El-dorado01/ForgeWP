import { ArrowRight, ChevronRight, User } from 'lucide-react';

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

interface MobileDrawerProps {
  isOpen: boolean;
  activeCategory: string | null;
  categoryData: SubmenuData | null;
  primaryMenuItems: { title: string; url: string }[];
  onBack: () => void;
  onSelectCategory: (category: string) => void;
  onLinkClick: () => void;
}

export default function MobileDrawer({
  isOpen,
  activeCategory,
  categoryData,
  primaryMenuItems,
  onBack,
  onSelectCategory,
  onLinkClick,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className='md:hidden fixed inset-x-0 top-[73px] bottom-0 bg-white z-40 border-t border-zinc-100 flex flex-col justify-between py-8 px-6 overflow-y-auto animate-in slide-in-from-top-5 duration-300'>
      {activeCategory && categoryData ? (
        <div className='flex flex-col gap-6 animate-in slide-in-from-right-5 duration-300'>
          {/* Back Button */}
          <button
            onClick={onBack}
            className='flex items-center gap-2 text-xs font-heading font-black uppercase tracking-wider text-brand self-start py-2 cursor-pointer hover:opacity-85'
          >
            <ArrowRight className='w-4 h-4 rotate-180' />
            Back to Menu
          </button>

          {/* Title */}
          <h3 className='font-heading font-black text-2xl uppercase tracking-tight text-zinc-900 border-b border-zinc-100 pb-3'>
            {categoryData.title}
          </h3>

          {/* Featured Card */}
          <div className='bg-zinc-50 border border-zinc-100 p-4 rounded-2xl flex flex-col gap-3'>
            <span className='inline-block bg-brand/10 text-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full w-fit'>
              {categoryData.featured.tag}
            </span>
            <h4 className='font-heading font-extrabold text-sm uppercase text-zinc-900 leading-tight'>
              {categoryData.featured.title}
            </h4>
            <p className='text-zinc-500 text-xs leading-relaxed'>
              {categoryData.featured.description}
            </p>
            <div className='relative aspect-video rounded-xl overflow-hidden shadow-xs border border-zinc-200/50 mt-2 select-none'>
              <img
                src={categoryData.featured.image}
                alt={categoryData.featured.title}
                className='w-full h-full object-cover'
              />
              <div className='absolute inset-0 bg-linear-to-t from-zinc-950/25 to-transparent' />
              <a
                href='#shop'
                onClick={onLinkClick}
                className='absolute bottom-2 right-2 bg-white/95 text-zinc-900 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1'
              >
                Shop
                <ArrowRight className='w-3 h-3' />
              </a>
            </div>
          </div>

          {/* Collections Lists */}
          <div className='space-y-6 mt-4 pb-8'>
            {categoryData.collections.map((col, idx) => (
              <div
                key={idx}
                className='flex flex-col gap-3'
              >
                <span className='font-heading font-extrabold text-[10px] uppercase tracking-widest text-zinc-400'>
                  {col.name}
                </span>
                <ul className='flex flex-col gap-2.5'>
                  {col.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <a
                        href={`#${item.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                        onClick={onLinkClick}
                        className='flex items-center justify-between text-sm font-medium text-zinc-600 hover:text-brand py-1'
                      >
                        <span>{item}</span>
                        <ChevronRight className='w-3.5 h-3.5 text-zinc-300' />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-6'>
          <span className='font-heading font-extrabold text-xs uppercase tracking-widest text-zinc-400'>
            Navigation
          </span>
          <div className='flex flex-col gap-5'>
            {primaryMenuItems.map((item, idx) => {
              const key = item.title.toLowerCase();
              const hasSubmenu = ['living', 'bedroom', 'dining', 'accents'].includes(key);
              return (
                <a
                  key={idx}
                  href={item.url}
                  onClick={(e) => {
                    if (hasSubmenu) {
                      e.preventDefault();
                      onSelectCategory(key);
                    } else {
                      onLinkClick();
                    }
                  }}
                  className='font-heading font-bold text-xl uppercase tracking-wider text-zinc-850 hover:text-brand transition-colors flex items-center justify-between group py-1'
                >
                  <span>{item.title}</span>
                  <ChevronRight className='w-5 h-5 text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all duration-300' />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {!activeCategory && (
        <div className='border-t border-zinc-100 pt-6 mt-8 flex flex-col gap-4'>
          <a
            href='#account'
            onClick={onLinkClick}
            className='flex items-center gap-3 py-2 text-zinc-600 hover:text-brand font-medium text-sm transition-colors'
          >
            <User className='w-5 h-5 stroke-[1.5]' />
            Account Settings
          </a>
          <p className='text-zinc-400 text-xs mt-2 font-medium'>
            &copy; {new Date().getFullYear()} Comfortable Decor. All rights
            reserved.
          </p>
        </div>
      )}
    </div>
  );
}
