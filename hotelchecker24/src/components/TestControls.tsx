import {
  WpEditable,
  defineEditable,
  text,
  color,
  image,
  boolean,
  select,
  number,
  url,
} from '@forgewp/react';

export const editable = defineEditable({
  title: text({ label: 'Custom Title', default: 'Discover Premium Experiences' }),
  bgColor: color({ label: 'Background Color', default: '#0f172a' }),
  bgImageUrl: text({ label: 'Image URL', default: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&w=800&q=80' }),
  featuredMedia: image({ label: 'Featured Media' }),
  buttonUrl: url({ label: 'Button URL', default: '#' }),
  isFeatured: boolean({ label: 'Featured Block', default: true }),
  layoutStyle: select({ label: 'Layout Style', options: ['grid', 'list', 'carousel'], default: 'grid' }),
  paddingSize: number({ label: 'Padding Size', min: 20, max: 120, default: 60 })
});

export interface TestControlsProps {
  title?: string;
  bgColor?: string;
  bgImageUrl?: string;
  featuredMedia?: {
    url: string;
    alt?: string;
    id?: number;
  };
  buttonUrl?: string;
  isFeatured?: boolean;
  layoutStyle?: 'grid' | 'list' | 'carousel';
  paddingSize?: number;
  setAttributes?: (attrs: Partial<TestControlsProps>) => void;
}

/**
 * @forgewp-block
 * title: Test Controls Block
 * category: design
 * icon: admin-generic
 * description: A demo block showcasing various controls including select, image, boolean, color, URL, and number controls.
 */
export function TestControls({
  title = 'Discover Premium Experiences',
  bgColor = '#0f172a',
  bgImageUrl = 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?auto=format&fit=crop&w=800&q=80',
  featuredMedia,
  buttonUrl = '#',
  isFeatured = true,
  layoutStyle = 'grid',
  paddingSize = 60,
  setAttributes,
}: TestControlsProps) {
  const mediaUrl = featuredMedia?.url || bgImageUrl;

  return (
    <div 
      style={{ 
        backgroundColor: bgColor, 
        paddingTop: paddingSize + 'px', 
        paddingBottom: paddingSize + 'px' 
      }} 
      className="w-full relative text-white overflow-hidden transition-all duration-300 font-sans border-b-4 border-amber-500"
    >
      {/* Decorative Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none"></div>

      {/* Featured Ribbon */}
      {isFeatured && (
        <div className="absolute top-0 right-0 z-20">
          <span className="bg-amber-500 text-slate-900 font-mono text-[9px] font-black uppercase tracking-widest px-4 py-1.5 shadow-md block">
            ★ FEATURED EXPERIENCE
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* 1. List Layout */}
        {layoutStyle === 'list' && (
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 text-left">
            <div className="flex-1 space-y-6">
              <span className="text-amber-500 font-mono text-[10px] font-black uppercase tracking-widest block">
                List Preset layout
              </span>
              <WpEditable
                tagName="h2"
                value={title}
                onChange={(val) => setAttributes && setAttributes({ title: val })}
                className="text-3xl md:text-5xl font-heading font-black tracking-tight leading-tight uppercase outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white/5 px-1 rounded"
              />
              <p className="text-white/60 text-xs md:text-sm leading-relaxed max-w-lg">
                This horizontal list configuration places the content alongside the media element, perfect for stacked index cards.
              </p>
              <div className="pt-2">
                <a 
                  href={buttonUrl}
                  onClick={(e) => { if (buttonUrl === '#') e.preventDefault(); }}
                  className="inline-flex items-center justify-center bg-amber-500 text-slate-900 font-mono font-black text-[10px] uppercase tracking-widest px-6 py-4 shadow-lg hover:bg-amber-400 transition-all"
                >
                  View Destination Details
                </a>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="aspect-video w-full overflow-hidden shadow-2xl border border-white/10 relative">
                {mediaUrl && (
                  <img 
                    src={mediaUrl} 
                    alt={title} 
                    className="w-full h-full object-cover"
                  />
                )}
                {!mediaUrl && (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-wider">
                    No Image Selected
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Carousel Layout */}
        {layoutStyle === 'carousel' && (
          <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
            <div className="space-y-4">
              <span className="text-amber-500 font-mono text-[10px] font-black uppercase tracking-widest block">
                Carousel Slide layout
              </span>
              <WpEditable
                tagName="h2"
                value={title}
                onChange={(val) => setAttributes && setAttributes({ title: val })}
                className="text-4xl md:text-6xl font-heading font-black tracking-tight leading-tight uppercase outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white/5 px-1 rounded mx-auto"
              />
            </div>

            <div className="w-full relative">
              <div className="aspect-21/9 w-full overflow-hidden shadow-2xl border border-white/10 relative">
                {mediaUrl && (
                  <img 
                    src={mediaUrl} 
                    alt={title} 
                    className="w-full h-full object-cover"
                  />
                )}
                {!mediaUrl && (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-wider">
                    No Image Selected
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <a 
                href={buttonUrl}
                onClick={(e) => { if (buttonUrl === '#') e.preventDefault(); }}
                className="inline-flex items-center justify-center bg-amber-500 text-slate-900 font-mono font-black text-[10px] uppercase tracking-widest px-8 py-4 shadow-lg hover:bg-amber-400 transition-all"
              >
                Explore Destinations
              </a>
            </div>
          </div>
        )}

        {/* 3. Grid / Default Layout */}
        {layoutStyle === 'grid' && (
          <div className="flex flex-col lg:flex-row items-center gap-12 text-left">
            <div className="flex-1 space-y-6">
              <span className="text-amber-500 font-mono text-[10px] font-black uppercase tracking-widest block">
                Grid Column layout
              </span>
              <WpEditable
                tagName="h2"
                value={title}
                onChange={(val) => setAttributes && setAttributes({ title: val })}
                className="text-3xl md:text-5xl font-heading font-black tracking-tight leading-tight uppercase outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white/5 px-1 rounded"
              />
              <p className="text-white/60 text-xs md:text-sm leading-relaxed max-w-lg">
                This layout structure is locked by the developer. Site editors can customize 
                the text, choose an image, pick a branding color, toggles, or slider sizing 
                safely without breaking responsiveness.
              </p>
              <div className="pt-2">
                <a 
                  href={buttonUrl}
                  onClick={(e) => { if (buttonUrl === '#') e.preventDefault(); }}
                  className="inline-flex items-center justify-center bg-amber-500 text-slate-900 font-mono font-black text-[10px] uppercase tracking-widest px-6 py-4 shadow-lg hover:bg-amber-400 transition-all"
                >
                  Explore Destinations
                </a>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <div className="aspect-video w-full overflow-hidden shadow-2xl border border-white/10 relative group">
                {mediaUrl && (
                  <img 
                    src={mediaUrl} 
                    alt={title} 
                    className="w-full h-full object-cover"
                  />
                )}
                {!mediaUrl && (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-wider">
                    No Image Selected
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
