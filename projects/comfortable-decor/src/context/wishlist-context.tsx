import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

type FlyingHeart = {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

type WishlistContextValue = {
  ids: number[];
  isWishlisted: (productId: number) => boolean;
  toggle: (productId: number, event?: React.MouseEvent | { clientX: number; clientY: number }) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const WishlistContext = React.createContext<WishlistContextValue | null>(null);

// ── GLOBAL CROSS-ISLAND STORE ───────────────────────────────────────
let globalWishlistIds: number[] = [];
const wishlistListeners = new Set<() => void>();

function notifyWishlist() {
  wishlistListeners.forEach((fn) => fn());
}

function saveWishlist(ids: number[]) {
  globalWishlistIds = ids;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('forgewp_wishlist_ids', JSON.stringify(ids));
    } catch {}
  }
  notifyWishlist();
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = React.useState<number[]>(() => globalWishlistIds);
  const [flyingHearts, setFlyingHearts] = React.useState<FlyingHeart[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('forgewp_wishlist_ids');
      if (saved) {
        globalWishlistIds = JSON.parse(saved);
        setIds(globalWishlistIds);
      }
    } catch {}

    const handleUpdate = () => {
      setIds([...globalWishlistIds]);
    };
    wishlistListeners.add(handleUpdate);
    return () => {
      wishlistListeners.delete(handleUpdate);
    };
  }, []);

  const isWishlisted = React.useCallback(
    (productId: number) => ids.includes(productId),
    [ids],
  );

  const toggle = React.useCallback((productId: number, event?: React.MouseEvent | { clientX: number; clientY: number }) => {
    const prev = globalWishlistIds;
    const willAdd = !prev.includes(productId);

    if (willAdd && typeof window !== 'undefined') {
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;

      if (event && 'clientX' in event) {
        startX = event.clientX;
        startY = event.clientY;
      }

      const targetEl = document.getElementById('header-wishlist-btn');
      let targetX = window.innerWidth - 90;
      let targetY = 32;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      const newHeart: FlyingHeart = {
        id: `${Date.now()}-${Math.random()}`,
        startX: startX - 12,
        startY: startY - 12,
        targetX: targetX - 12,
        targetY: targetY - 12,
      };

      setFlyingHearts((current) => [...current, newHeart]);

      setTimeout(() => {
        setFlyingHearts((current) => current.filter((h) => h.id !== newHeart.id));
      }, 850);
    }

    const updated = willAdd ? [...prev, productId] : prev.filter((id) => id !== productId);
    saveWishlist(updated);
  }, []);

  const remove = React.useCallback((productId: number) => {
    saveWishlist(globalWishlistIds.filter((id) => id !== productId));
  }, []);

  const clear = React.useCallback(() => saveWishlist([]), []);

  const value = React.useMemo(
    () => ({ ids, isWishlisted, toggle, remove, clear }),
    [ids, isWishlisted, toggle, remove, clear],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}

      {/* Global Flying Heart Particle Layer */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" aria-hidden="true">
        <AnimatePresence>
          {flyingHearts.map((heart) => {
            const midX = (heart.startX + heart.targetX) / 2 + (Math.random() * 40 - 20);
            const midY = Math.min(heart.startY, heart.targetY) - 50;

            return (
              <motion.div
                key={heart.id}
                initial={{
                  x: heart.startX,
                  y: heart.startY,
                  scale: 0.5,
                  opacity: 1,
                }}
                animate={{
                  x: [heart.startX, midX, heart.targetX],
                  y: [heart.startY, midY, heart.targetY],
                  scale: [0.5, 1.4, 0.4],
                  opacity: [1, 1, 0.2],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.5, 1],
                }}
                className="absolute flex items-center justify-center h-7 w-7 rounded-full bg-terracotta text-white shadow-lg drop-shadow-md"
              >
                <Heart className="h-4 w-4 fill-white text-white" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = React.useContext(WishlistContext);
  
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (ctx) return;
    const update = () => setTick((t) => t + 1);
    wishlistListeners.add(update);
    return () => {
      wishlistListeners.delete(update);
    };
  }, [ctx]);

  if (ctx) return ctx;

  const ids = globalWishlistIds;

  return {
    ids,
    isWishlisted: (productId: number) => ids.includes(productId),
    toggle: (productId: number) => {
      const prev = globalWishlistIds;
      const willAdd = !prev.includes(productId);
      const updated = willAdd ? [...prev, productId] : prev.filter((id) => id !== productId);
      saveWishlist(updated);
    },
    remove: (productId: number) => {
      saveWishlist(globalWishlistIds.filter((id) => id !== productId));
    },
    clear: () => {
      saveWishlist([]);
    },
  };
}
