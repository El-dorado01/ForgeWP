import { Search, X } from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-start justify-center pt-24 px-6'>
      <div className='bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-zinc-100 animate-in slide-in-from-top-4 duration-300'>
        <div className='flex justify-between items-center mb-4'>
          <span className='font-heading font-black text-sm uppercase tracking-wider text-zinc-400'>
            Search Products
          </span>
          <button
            onClick={onClose}
            className='p-1 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
        <div className='relative flex items-center'>
          <Search className='absolute left-4 w-5 h-5 text-zinc-400' />
          <input
            type='text'
            placeholder='What are you looking for? (e.g. stool, lighting, bouclé...)'
            autoFocus
            className='w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:border-brand focus:bg-white transition-all shadow-inner'
          />
        </div>
        <div className='mt-4 flex flex-wrap gap-2'>
          <span className='text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center'>
            Popular:
          </span>
          {['Chair', 'Vase', 'Linen', 'Ambient'].map((tag) => (
            <button
              key={tag}
              className='bg-zinc-50 hover:bg-brand hover:text-white border border-zinc-100/60 px-3 py-1 text-xs text-zinc-600 rounded-full transition-colors cursor-pointer'
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
