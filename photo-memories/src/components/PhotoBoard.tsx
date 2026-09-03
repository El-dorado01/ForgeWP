import { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Shuffle,
  Plus,
  Trash2,
  Heart,
  X,
  Sparkles,
  Maximize2,
} from 'lucide-react';

interface Photo {
  id: string;
  caption: string;
  image: string;
  bgColor: string;
  textColor: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  rotation: number; // degrees (-15 to 15)
  likes: number;
}

interface FloatingHeart {
  id: string;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'truck-abuja',
    caption: 'Truck central Abuja',
    image:
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600',
    bgColor: '#C4F2C2',
    textColor: '#1f591d',
    x: 15,
    y: 11,
    rotation: -6,
    likes: 12,
  },
  {
    id: 'vacation-lounge',
    caption: 'Vacation',
    image:
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=600',
    bgColor: '#FDF8C7',
    textColor: '#593608',
    x: 4,
    y: 57,
    rotation: -9,
    likes: 38,
  },
  {
    id: 'pilot-me',
    caption: 'Pilot me',
    image:
      'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?auto=format&fit=crop&q=80&w=600',
    bgColor: '#F6E3FF',
    textColor: '#4c165c',
    x: 22,
    y: 59,
    rotation: 8,
    likes: 27,
  },
  {
    id: 'arabian-tea',
    caption: 'Arabian Tea Memory',
    image:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600',
    bgColor: '#FFFFFF',
    textColor: '#1f2937',
    x: 37,
    y: 50,
    rotation: -4,
    likes: 45,
  },
  {
    id: 'boy-launch-top',
    caption: 'Fine boy launch',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600',
    bgColor: '#FFE3EB',
    textColor: '#75122e',
    x: 49,
    y: 13,
    rotation: -12,
    likes: 19,
  },
  {
    id: 'girl-biba',
    caption: 'Star Girl Biba',
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    bgColor: '#DEF0FF',
    textColor: '#0a3d5e',
    x: 52,
    y: 63,
    rotation: 7,
    likes: 84,
  },
  {
    id: 'man-play',
    caption: 'Watching my man play',
    image:
      'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=600',
    bgColor: '#FFE5D5',
    textColor: '#78250b',
    x: 69,
    y: 42,
    rotation: 3,
    likes: 56,
  },
  {
    id: 'boy-launch-bottom',
    caption: 'Fine boy launch',
    image:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600',
    bgColor: '#E3E4FF',
    textColor: '#22185c',
    x: 77,
    y: 62,
    rotation: -10,
    likes: 31,
  },
];

const BORDER_PRESETS = [
  { name: 'White', bg: '#FFFFFF', border: '#e4e4e7', text: '#1f2937' },
  { name: 'Green', bg: '#C4F2C2', border: '#A9ECA6', text: '#1f591d' },
  { name: 'Pink', bg: '#FFE3EB', border: '#fbcfe8', text: '#75122e' },
  { name: 'Peach', bg: '#FFE5D5', border: '#fed7aa', text: '#78250b' },
  { name: 'Yellow', bg: '#FDF8C7', border: '#fef08a', text: '#593608' },
  { name: 'Lilac', bg: '#F6E3FF', border: '#e9d5ff', text: '#4c165c' },
  { name: 'Blue', bg: '#DEF0FF', border: '#bae6fd', text: '#0a3d5e' },
  { name: 'Lavender', bg: '#E3E4FF', border: '#c7d2fe', text: '#22185c' },
];

const PRESET_IMAGES = [
  {
    name: 'Cozy Coffee',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Beach Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Vintage Vinyl',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Cute Kitten',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Night Lights',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Forest Trail',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600',
  },
];

export default function PhotoBoard() {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(20);
  const [zIndices, setZIndices] = useState<Record<string, number>>(() => {
    const indices: Record<string, number> = {};
    INITIAL_PHOTOS.forEach((p, index) => {
      indices[p.id] = index + 1;
    });
    return indices;
  });

  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Add Photo Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Delete Confirmation State
  const [photoToDeleteId, setPhotoToDeleteId] = useState<string | null>(null);

  const closeDrawer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{
    id: string;
    startX: number;
    startY: number;
    startPhotoX: number;
    startPhotoY: number;
    boardWidth: number;
    boardHeight: number;
  } | null>(null);

  const activeCardEl = useRef<HTMLDivElement | null>(null);
  const lastCoords = useRef<{ x: number; y: number } | null>(null);

  // Drag Handlers
  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    photo: Photo,
  ) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }

    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setZIndices((prev) => ({ ...prev, [photo.id]: nextZ }));

    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const cardEl = e.currentTarget as HTMLDivElement;
    activeCardEl.current = cardEl;

    cardEl.style.cursor = 'grabbing';
    cardEl.style.boxShadow = '0 30px 50px rgba(0, 0, 0, 0.4)';
    cardEl.style.transform = 'scale(1.03)';
    cardEl.style.transition = 'none';

    dragInfo.current = {
      id: photo.id,
      startX: clientX,
      startY: clientY,
      startPhotoX: photo.x,
      startPhotoY: photo.y,
      boardWidth: rect.width,
      boardHeight: rect.height,
    };

    lastCoords.current = { x: photo.x, y: photo.y };
    setActiveDragId(photo.id);
  };

  useEffect(() => {
    if (!activeDragId) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragInfo.current || !activeCardEl.current) return;
      const {
        startX,
        startY,
        startPhotoX,
        startPhotoY,
        boardWidth,
        boardHeight,
      } = dragInfo.current;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = clientX - startX;
      const dy = clientY - startY;

      const pdx = (dx / boardWidth) * 100;
      const pdy = (dy / boardHeight) * 100;

      let newX = startPhotoX + pdx;
      let newY = startPhotoY + pdy;

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const maxY = isMobile ? 74 : 58;
      newX = Math.max(-2, Math.min(83, newX));
      newY = Math.max(-2, Math.min(maxY, newY));

      lastCoords.current = { x: newX, y: newY };

      activeCardEl.current.style.left = `${newX}%`;
      activeCardEl.current.style.top = `${newY}%`;
    };

    const handleEnd = () => {
      const cardEl = activeCardEl.current;
      const coords = lastCoords.current;
      const id = dragInfo.current?.id;

      if (cardEl) {
        cardEl.style.cursor = '';
        cardEl.style.boxShadow = '';
        cardEl.style.transform = '';
        cardEl.style.transition = '';
      }

      if (id && coords) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, x: coords.x, y: coords.y } : p,
          ),
        );
      }

      setActiveDragId(null);
      activeCardEl.current = null;
      dragInfo.current = null;
      lastCoords.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [activeDragId]);

  const handleShuffle = () => {
    setPhotos((prev) =>
      prev.map((photo) => {
        const randomX = Math.random() * 78 + 2;
        const isMobile =
          typeof window !== 'undefined' && window.innerWidth < 768;
        const randomY = Math.random() * (isMobile ? 66 : 50) + 5;
        const randomRotation = Math.random() * 24 - 12;
        return {
          ...photo,
          x: randomX,
          y: randomY,
          rotation: randomRotation,
        };
      }),
    );
  };

  const handleReset = () => {
    setPhotos(INITIAL_PHOTOS);
    const indices: Record<string, number> = {};
    INITIAL_PHOTOS.forEach((p, index) => {
      indices[p.id] = index + 1;
    });
    setZIndices(indices);
    setMaxZIndex(20);
  };

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id ? { ...photo, likes: photo.likes + 1 } : photo,
      ),
    );

    const clientX = e.clientX;
    const clientY = e.clientY;

    const newHearts = Array.from({ length: 5 }).map((_, i) => ({
      id: `${id}-heart-${Date.now()}-${i}`,
      x: clientX,
      y: clientY,
      angle: (i - 2) * 15 + (Math.random() * 10 - 5),
      delay: i * 80,
    }));

    setFloatingHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setFloatingHearts((prev) =>
        prev.filter((h) => !newHearts.find((nh) => nh.id === h.id)),
      );
    }, 1200);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoToDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (photoToDeleteId) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoToDeleteId));
      setPhotoToDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setPhotoToDeleteId(null);
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim() || !newImageUrl.trim()) return;

    const selectedColor = BORDER_PRESETS[selectedColorIndex];
    const newId = `custom-${Date.now()}`;
    const newPhoto: Photo = {
      id: newId,
      caption: newCaption,
      image: newImageUrl,
      bgColor: selectedColor.bg,
      textColor: selectedColor.text,
      x: 35 + Math.random() * 10,
      y: 20 + Math.random() * 10,
      rotation: Math.random() * 16 - 8,
      likes: 0,
    };

    setPhotos((prev) => [...prev, newPhoto]);
    setZIndices((prev) => ({ ...prev, [newId]: maxZIndex + 1 }));
    setMaxZIndex(maxZIndex + 1);

    setNewCaption('');
    setNewImageUrl('');
    closeDrawer();
  };

  return (
    <div className='w-full flex flex-col items-center justify-start'>
      {/* ── HEADER ── */}
      <header className='text-center mb-8 shrink-0 select-none'>
        <h1 className='font-handwritten text-4xl md:text-5xl text-[#1c1917] tracking-wide drop-shadow-xs font-bold leading-tight'>
          hang your Favorite photos
        </h1>
        <p className='text-stone-500 text-sm md:text-base font-medium mt-1 tracking-wide'>
          Drag the photos and arrange them
        </p>
      </header>

      {/* ── MAIN CORKBOARD BOARD ── */}
      <main className='w-full max-w-5xl relative select-none z-10'>
        <div
          ref={boardRef}
          className='w-full aspect-16/13.5 md:aspect-16/8 min-h-[510px] md:min-h-[440px] rounded-[1.75rem] md:rounded-[2.5rem] border-10 md:border-16 border-[#3e2723] relative shadow-[inset_0_4px_20px_rgba(0,0,0,0.35),0_12px_28px_rgba(0,0,0,0.15)] overflow-hidden cursor-default transition-all duration-300'
          style={{
            backgroundColor: '#92613D',
            backgroundImage: `
          radial-gradient(rgba(0, 0, 0, 0.16) 9%, transparent 9%),
          radial-gradient(rgba(255, 255, 255, 0.06) 9%, transparent 9%)
        `,
            backgroundSize: '6px 6px',
            backgroundPosition: '0 0, 3px 3px',
          }}
        >
          {/* Subtle wood-grain gradient overlay */}
          <div className='absolute inset-0 bg-linear-to-tr from-black/15 via-transparent to-white/10 pointer-events-none z-0' />

          {/* Render scattered photo cards */}
          {photos.map((photo) => {
            const isDragging = activeDragId === photo.id;
            return (
              <div
                key={photo.id}
                onMouseDown={(e) => handleDragStart(e, photo)}
                onTouchStart={(e) => handleDragStart(e, photo)}
                onDoubleClick={() => setLightboxPhoto(photo)}
                className={`absolute p-3 pb-5 rounded-xl shadow-lg transition-shadow duration-300 select-none cursor-grab flex flex-col justify-start items-center ${
                  isDragging
                    ? 'cursor-grabbing shadow-2xl scale-[1.03] ring-2 ring-amber-500/20'
                    : 'hover:shadow-2xl hover:scale-[1.02] hover:rotate-0'
                }`}
                style={{
                  left: `${photo.x}%`,
                  top: `${photo.y}%`,
                  width: '18.5%',
                  minWidth: '135px',
                  maxWidth: '200px',
                  backgroundColor: photo.bgColor,
                  transform: isDragging
                    ? undefined
                    : `rotate(${photo.rotation}deg)`,
                  zIndex: zIndices[photo.id] || 1,
                  border: `1.5px solid ${photo.bgColor === '#FFFFFF' ? '#e4e4e7' : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDragging
                    ? '0 30px 50px rgba(0, 0, 0, 0.4)'
                    : '0 10px 20px rgba(0, 0, 0, 0.2)',
                  transition: isDragging
                    ? 'transform 0.05s ease-out, shadow 0.15s ease'
                    : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
                  willChange: 'left, top, transform',
                }}
              >
                {/* Washi Tape/Peg Decoration at top center */}
                <div className='absolute -top-3.5 left-1/2 -translate-x-1/2 w-10 h-6 bg-white/35 backdrop-blur-xs border border-white/20 -rotate-1 shadow-[0_1px_3px_rgba(0,0,0,0.08)] pointer-events-none z-10' />

                {/* Polaroid Image Wrapper */}
                <div className='w-full aspect-square bg-[#eceae6] rounded-md overflow-hidden relative group/img shadow-inner'>
                  <img
                    src={photo.image}
                    alt={photo.caption}
                    className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none'
                  />
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none' />

                  {/* Actions Overlay (visible on hover) */}
                  <div className='absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/15 backdrop-blur-xs rounded-md'>
                    <button
                      onClick={() => setLightboxPhoto(photo)}
                      title='Enlarge'
                      className='p-1.5 bg-white/95 text-stone-700 hover:text-black rounded-full shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer'
                    >
                      <Maximize2 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(photo.id, e)}
                      title='Delete Memory'
                      className='p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>

                {/* Polaroid Caption Text */}
                <div className='w-full text-center mt-3 px-1 flex flex-col items-center'>
                  <span
                    className='font-handwritten text-[1.05rem] md:text-[1.25rem] font-bold line-clamp-1 select-none'
                    style={{ color: photo.textColor }}
                  >
                    {photo.caption}
                  </span>

                  {/* Bottom Bar: Interactive Likes & Delete */}
                  <div className='mt-1.5 flex items-center justify-center gap-1.5 shrink-0 select-none'>
                    <button
                      onClick={(e) => handleLike(photo.id, e)}
                      className='flex items-center gap-1 text-[11px] font-sans font-bold bg-black/5 hover:bg-black/10 active:bg-black/15 py-1 px-3 rounded-full transition-all cursor-pointer group/like'
                      style={{ color: photo.textColor }}
                      title='Like photo'
                    >
                      <Heart className='w-3.5 h-3.5 text-red-500 fill-red-500 group-hover/like:scale-120 transition-transform duration-200' />
                      <span>{photo.likes}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(photo.id, e)}
                      className='flex items-center gap-1.5 text-[11px] font-sans font-bold bg-black/5 hover:bg-red-500 hover:text-white active:bg-red-600 py-1 px-2.5 rounded-full transition-all cursor-pointer group/delete'
                      style={{ color: photo.textColor }}
                      title='Delete memory'
                    >
                      <Trash2 className='w-3.5 h-3.5 text-stone-500 group-hover/delete:text-current transition-colors' />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty board state helper */}
          {photos.length === 0 && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-black/10 text-stone-100 animate-fade-in'>
              <Sparkles className='w-12 h-12 mb-3 opacity-80' />
              <p className='font-handwritten text-3xl font-bold'>
                The board is empty
              </p>
              <p className='text-xs font-sans mt-1 opacity-70'>
                Click "Add Memory" to pin a new photo card!
              </p>
            </div>
          )}
        </div>

        {/* ── DIALOG/MODAL: ADD MEMORY ── */}
        {isAddModalOpen && (
          <div
            onClick={closeDrawer}
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center md:items-center p-0 md:p-4 z-50 ${
              isClosing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`bg-white w-full max-w-md rounded-t-3xl rounded-b-none md:rounded-2xl shadow-2xl border-t md:border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col ${
                isClosing
                  ? 'animate-slide-down-drawer md:animate-scale-down'
                  : 'animate-slide-up-drawer md:animate-scale-up'
              }`}
            >
              {/* Drawer Drag Handle (Mobile Only) */}
              <div className='flex justify-center py-2.5 md:hidden shrink-0 bg-stone-50 border-b border-stone-100'>
                <div className='w-12 h-1 bg-stone-300 rounded-full' />
              </div>

              {/* Modal/Drawer Header */}
              <div className='px-6 py-4 flex items-center justify-between shrink-0'>
                <div className='flex items-center gap-2 font-handwritten text-2xl font-bold'>
                  Add a new Memory
                </div>
                <button
                  onClick={closeDrawer}
                  className='text-black p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              {/* Add Memory Scrollable Form Body */}
              <form
                onSubmit={handleAddPhotoSubmit}
                className='flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5 max-h-[75vh]'
              >
                {/* Image Selection Presets */}
                <div className='flex flex-col gap-2'>
                  <span className='text-xs font-bold text-stone-500 uppercase tracking-wider'>
                    Quick Image Preset
                  </span>
                  <div className='grid grid-cols-3 gap-2'>
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type='button'
                        onClick={() => setNewImageUrl(preset.url)}
                        className={`h-14 rounded-lg overflow-hidden border-2 relative transition-all active:scale-95 cursor-pointer ${
                          newImageUrl === preset.url
                            ? 'border-stone-900 shadow-md'
                            : 'border-transparent opacity-85 hover:opacity-100 hover:scale-102'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className='w-full h-full object-cover'
                        />
                        <div className='absolute inset-x-0 bottom-0 bg-black/50 text-[9px] text-white py-0.5 text-center truncate px-1'>
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Image URL Field */}
                <div className='flex flex-col gap-1.5'>
                  <label
                    htmlFor='img-url'
                    className='text-xs font-bold text-stone-500 uppercase tracking-wider'
                  >
                    Or Custom Image URL
                  </label>
                  <input
                    id='img-url'
                    type='url'
                    placeholder='https://images.unsplash.com/...'
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className='border border-stone-200 focus:border-stone-900 focus:outline-hidden p-3 rounded-xl text-sm transition-colors bg-stone-50 font-sans'
                    required
                  />
                </div>

                {/* Caption Field */}
                <div className='flex flex-col gap-1.5'>
                  <label
                    htmlFor='caption-text'
                    className='text-xs font-bold text-stone-500 uppercase tracking-wider'
                  >
                    Handwritten Caption
                  </label>
                  <input
                    id='caption-text'
                    type='text'
                    placeholder='e.g., Beach trip with the squad'
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    maxLength={32}
                    className='border border-stone-200 focus:border-stone-900 focus:outline-hidden p-3 rounded-xl text-sm transition-colors bg-stone-50 font-sans'
                    required
                  />
                </div>

                {/* Border Color Presets */}
                <div className='flex flex-col gap-2'>
                  <span className='text-xs font-bold text-stone-500 uppercase tracking-wider'>
                    Card Paper Theme
                  </span>
                  <div className='flex flex-wrap gap-2.5'>
                    {BORDER_PRESETS.map((color, idx) => (
                      <button
                        key={color.name}
                        type='button'
                        onClick={() => setSelectedColorIndex(idx)}
                        className={`h-7 px-3 rounded-full text-xs font-bold border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                          selectedColorIndex === idx
                            ? 'border-stone-950 scale-105 shadow-xs'
                            : 'border-stone-200 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: color.bg,
                          color: color.text,
                        }}
                      >
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form submit button */}
                <button
                  type='submit'
                  className='w-full bg-[#7b4f37] hover:bg-[#6b442f] text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:scale-102 active:scale-98 shadow-md shadow-[#7b4f37]/10 mt-2 font-sans cursor-pointer'
                >
                  Pin memory to corkboard
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── DIALOG/MODAL: LIGHTBOX / IMAGE PREVIEW ── */}
        {lightboxPhoto && (
          <div
            onClick={() => setLightboxPhoto(null)}
            className='fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in cursor-zoom-out'
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className='p-4 md:p-5 pb-6 rounded-2xl shadow-2xl flex flex-col justify-start items-center relative animate-scale-up border max-w-sm md:max-w-md w-full max-h-[90vh] overflow-hidden'
              style={{
                backgroundColor: lightboxPhoto.bgColor,
                borderColor:
                  lightboxPhoto.bgColor === '#FFFFFF'
                    ? '#e2e8f0'
                    : 'rgba(0,0,0,0.06)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setLightboxPhoto(null)}
                className='absolute top-2 right-2 bg-stone-900/80 hover:bg-stone-950 text-white p-1.5 rounded-full hover:scale-110 transition-transform shadow-md cursor-pointer z-10'
              >
                <X className='w-4 h-4' />
              </button>

              {/* Polaroid Image */}
              <div className='w-full h-[250px] md:h-[310px] bg-stone-100 rounded-lg overflow-hidden shadow-md flex items-center justify-center mt-4'>
                <img
                  src={lightboxPhoto.image}
                  alt={lightboxPhoto.caption}
                  className='w-full h-full object-cover'
                />
              </div>

              {/* Caption & Likes */}
              <div className='w-full text-center mt-4 px-1 shrink-0'>
                <h2
                  className='font-handwritten text-2xl md:text-3xl font-bold select-text line-clamp-1'
                  style={{ color: lightboxPhoto.textColor }}
                >
                  {lightboxPhoto.caption}
                </h2>
                <div className='mt-2 flex items-center justify-center gap-2'>
                  <span
                    className='flex items-center gap-1.5 text-xs font-sans font-bold bg-black/5 py-0.5 px-3 rounded-full select-none'
                    style={{ color: lightboxPhoto.textColor }}
                  >
                    <Heart className='w-3.5 h-3.5 text-red-500 fill-red-500' />
                    <span>{lightboxPhoto.likes} Likes</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DIALOG/MODAL: DELETE CONFIRMATION ── */}
        {photoToDeleteId && (
          <div
            onClick={handleCancelDelete}
            className='fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in cursor-default'
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className='bg-white rounded-2xl p-6 max-w-xs md:max-w-sm w-full shadow-2xl border border-stone-200 flex flex-col items-center text-center animate-scale-up'
            >
              {/* Warning Icon */}
              <div className='bg-red-50 p-3 rounded-full text-red-500 mb-4 border border-red-100 animate-pulse'>
                <Trash2
                  className='w-6 h-6 animate-bounce'
                  style={{ animationDuration: '2s' }}
                />
              </div>

              {/* Title & Description */}
              <h3 className='font-sans font-bold text-lg text-stone-900 mb-1.5'>
                Delete Memory?
              </h3>
              <p className='text-stone-500 text-xs md:text-sm leading-relaxed mb-6 font-sans'>
                Are you sure you want to remove this photo memory? This action
                cannot be undone.
              </p>

              {/* Actions */}
              <div className='flex w-full gap-3 font-sans'>
                <button
                  onClick={handleCancelDelete}
                  className='flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-xs md:text-sm active:scale-98'
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className='flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-xs md:text-sm shadow-md shadow-red-500/10 active:scale-98 animate-pulse'
                  style={{ animationDuration: '3s' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAILWIND CUSTOM ANIMATIONS UTILITY INLINE STYLE ── */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
    @keyframes heartBurst {
      0% {
        transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 0.9;
      }
      100% {
        transform: translate(
          calc(-50% + cos(var(--angle)) * 90px),
          calc(-50% + sin(var(--angle)) * 90px - 70px)
        ) scale(1.3) rotate(calc(var(--angle) * 0.4));
        opacity: 0;
      }
    }
    .animate-heart-burst {
      animation: heartBurst 0.9s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fadeIn 0.25s ease-out forwards;
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .animate-fade-out {
      animation: fadeOut 0.25s ease-in forwards;
    }

    @keyframes scaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-up {
      animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    @keyframes scaleDown {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.95); opacity: 0; }
    }
    .animate-scale-down {
      animation: scaleDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes slideUpDrawer {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up-drawer {
      animation: slideUpDrawer 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes slideDownDrawer {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
    .animate-slide-down-drawer {
      animation: slideDownDrawer 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Floating Hearts Explosion Styles */
    .floating-heart {
      position: fixed;
      pointer-events: none;
      z-index: 100;
      color: #ef4444;
      fill: #ef4444;
      font-size: 1.5rem;
      line-height: 1;
    }
  `,
          }}
        />

        {/* Floating Hearts elements container */}
        {floatingHearts.map((heart) => (
          <span
            key={heart.id}
            className='floating-heart animate-heart-burst'
            style={{
              left: `${heart.x}px`,
              top: `${heart.y}px`,
              // @ts-ignore
              '--angle': `${heart.angle}deg`,
              animationDelay: `${heart.delay}ms`,
            }}
          >
            ♥
          </span>
        ))}
      </main>

      {/* ── BOTTOM CONTROL TOOLBAR ── */}
      <footer className='mt-8 shrink-0 flex flex-wrap justify-center items-center gap-3 md:gap-4 z-1 select-none max-w-full px-4'>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className='flex items-center gap-2 bg-[#7b4f37] hover:bg-[#6b442f] text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-98 transition-all cursor-pointer font-sans font-bold text-sm tracking-wide group shadow-[#7b4f37]/10'
        >
          <Plus className='w-4 h-4 transition-transform duration-300 group-hover:rotate-90' />
          <span>Add Memory</span>
        </button>

        <button
          onClick={handleShuffle}
          className='flex items-center gap-2 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 hover:text-black hover:border-stone-400 px-5 py-3 rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-98 transition-all cursor-pointer font-sans font-bold text-sm tracking-wide group'
        >
          <Shuffle className='w-4 h-4 transition-transform duration-500 group-hover:rotate-180 text-stone-500 group-hover:text-black' />
          <span>Scatter Board</span>
        </button>

        <button
          onClick={handleReset}
          title='Reset board layout to mockup presets'
          className='flex items-center gap-2 justify-center bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 hover:text-black px-5 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:scale-105 active:scale-98 transition-all cursor-pointer group'
        >
          <RotateCcw className='w-4 h-4 transition-transform duration-500 group-hover:-rotate-180' />
          <span>Reset Board</span>
        </button>
      </footer>
    </div>
  );
}
