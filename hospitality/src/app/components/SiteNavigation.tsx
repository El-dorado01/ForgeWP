import { useWpMenu, useLocation, type WpMenuItem } from '@forgewp/react';
import { ArrowUpRight, Plus } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { useEffect, useState } from 'react';

type SiteNavigationProps = {
  heroPassed?: boolean;
  reduceMotion?: boolean | null;
  revealInitial?: false | 'hidden';
  revealVariants?: Variants;
};

const defaultRevealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

function resolveLandingUrl(url: string, pathname: string) {
  return url.startsWith('#') && pathname !== '/' ? `/${url}` : url;
}

function matchesMenuRoute(url: string, pathname: string) {
  if (url.startsWith('#') || url.includes('#')) return false;

  const normalizePath = (value: string) => {
    const path = value.split(/[?#]/, 1)[0] || '/';
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
  };
  const targetPath = normalizePath(url);
  const currentPath = normalizePath(pathname);

  return (
    currentPath === targetPath ||
    (targetPath !== '/' && currentPath.startsWith(`${targetPath}/`))
  );
}

function getActiveExpandedItems(items: WpMenuItem[], pathname: string) {
  return items.reduce<Record<string, boolean>>((expanded, item) => {
    if (item.children?.length) {
      expanded[item.id ?? item.url] =
        matchesMenuRoute(item.url, pathname) ||
        item.children.some((child) => matchesMenuRoute(child.url, pathname));
    }
    return expanded;
  }, {});
}

function MenuLink({
  item,
  href,
  onSelect,
  className,
  isActive,
}: {
  item: WpMenuItem;
  href: string;
  onSelect: () => void;
  className: string;
  isActive: boolean;
}) {
  return (
    <a
      href={href}
      onClick={onSelect}
      className={`${className} ${isActive ? '!text-accent' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      target={item.target || undefined}
      rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      {item.title}
    </a>
  );
}

export default function SiteNavigation({
  heroPassed = true,
  reduceMotion: reduceMotionProp,
  revealInitial: revealInitialProp,
  revealVariants: revealVariantsProp,
}: SiteNavigationProps) {
  const preferredReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionProp ?? preferredReduceMotion;
  const revealInitial = revealInitialProp ?? (reduceMotion ? false : 'hidden');
  const revealVariants = revealVariantsProp ?? defaultRevealVariants;
  const [pathname] = useLocation();
  const { items: primaryItems } = useWpMenu('primary');
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState(() =>
    getActiveExpandedItems(primaryItems, pathname),
  );

  useEffect(() => {
    const nextExpandedItems = getActiveExpandedItems(primaryItems, pathname);
    setExpandedItems((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextExpandedItems);
      const unchanged =
        currentKeys.length === nextKeys.length &&
        currentKeys.every((key) => current[key] === nextExpandedItems[key]);

      return unchanged ? current : nextExpandedItems;
    });
  }, [pathname, primaryItems]);

  const closeMenu = () => setMenuOpen(false);
  const toggleExpanded = (item: WpMenuItem) => {
    const key = item.id ?? item.url;
    setExpandedItems((current) => {
      const nextExpanded = !current[key];
      return Object.keys(current).reduce<Record<string, boolean>>(
        (next, itemKey) => {
          next[itemKey] = nextExpanded && itemKey === key;
          return next;
        },
        {},
      );
    });
  };

  useEffect(() => {
    if (!menuOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [menuOpen]);

  const hasActiveExpandedItem = Object.values(expandedItems).some(Boolean);

  return (
    <>
      <header
        className={`mx-auto flex w-full items-center justify-between px-5 py-5 transition-all duration-500 sm:px-8 lg:px-12 ${menuOpen ? 'fixed inset-x-0 top-0 z-[60] max-w-none text-white' : heroPassed ? 'fixed inset-x-0 top-0 z-50 max-w-none border-b border-slate-200/80 bg-[#f8fafc]/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md' : 'relative z-30 max-w-[1440px]'}`}
      >
        <motion.a
          href='/'
          className='relative block h-9 w-28'
          aria-label='DICON home'
          initial={revealInitial}
          animate='visible'
          variants={revealVariants}
        >
          <img
            src='/Logo_DICON-removebg-preview.png'
            alt='DICON Beratung'
            className='h-full w-full object-contain object-left'
          />
        </motion.a>

        <motion.button
          type='button'
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls='site-menu'
          className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${menuOpen ? 'text-white hover:text-accent' : 'text-brand hover:text-accent'}`}
          initial={revealInitial}
          animate='visible'
          variants={revealVariants}
          transition={{ delay: 0.12 }}
        >
          {menuOpen ? 'close' : 'menu'}
        </motion.button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id='site-menu'
            className='fixed inset-0 z-50 flex h-dvh min-h-0 flex-col overflow-y-auto bg-[#132640] px-5 pb-12 pt-28 text-white overscroll-contain sm:px-8 lg:px-12'
            initial={reduceMotion ? false : { clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={reduceMotion ? undefined : { clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <div className='mx-auto flex min-h-full w-full max-w-[1440px] flex-1 flex-col justify-between'>
              <motion.nav
                layout
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={`grid max-w-6xl grid-cols-1 items-stretch transition-[grid-template-columns] duration-500 ease-out ${hasActiveExpandedItem ? 'lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-x-16' : 'lg:grid-cols-1'}`}
                aria-label='Main navigation'
              >
                <div className='flex flex-col'>
                  {primaryItems.map((item, index) => {
                    const itemKey = item.id ?? item.url;
                    const hasChildren = Boolean(item.children?.length);
                    const isExpanded = expandedItems[itemKey];
                    const isActive =
                      matchesMenuRoute(item.url, pathname) ||
                      Boolean(
                        item.children?.some((child) =>
                          matchesMenuRoute(child.url, pathname),
                        ),
                      );
                    const hasActiveItem =
                      Object.values(expandedItems).some(Boolean);
                    const isInactive = hasActiveItem && !isExpanded;
                    const itemClassName = `group flex w-full shrink-0 items-center gap-5 border-b border-white/15 py-4 text-left font-heading text-3xl font-bold leading-tight tracking-[-0.04em] transition-[opacity,color,border-color] duration-500 hover:border-accent hover:text-accent sm:gap-8 sm:py-5 sm:text-5xl ${isActive ? 'border-accent text-accent' : 'text-white'} ${isInactive ? 'opacity-30' : 'opacity-100'}`;

                    return (
                      <div key={itemKey}>
                        {hasChildren ? (
                          <button
                            type='button'
                            aria-controls={`desktop-submenu-${index}`}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpanded(item)}
                            className={itemClassName}
                          >
                            <span className='font-mono text-[10px] font-normal tracking-[0.12em] text-accent sm:text-xs'>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className='flex-1'>{item.title}</span>
                            <motion.span
                              className='flex size-9 shrink-0 items-center justify-center text-accent sm:size-10'
                              animate={{
                                rotate: isExpanded ? 45 : 0,
                                scale: isExpanded ? 1.05 : 1,
                              }}
                              transition={{
                                duration: 0.35,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              aria-hidden='true'
                            >
                              <Plus className='size-6 sm:size-7' />
                            </motion.span>
                          </button>
                        ) : (
                          <motion.a
                            href={resolveLandingUrl(item.url, pathname)}
                            onClick={closeMenu}
                            className={`${itemClassName} justify-between`}
                            aria-current={isActive ? 'page' : undefined}
                            initial={
                              reduceMotion ? false : { opacity: 0, y: 24 }
                            }
                            animate={{ opacity: isInactive ? 0.3 : 1, y: 0 }}
                            transition={{
                              delay: 0.28 + index * 0.07,
                              duration: 0.55,
                              ease: 'easeOut',
                            }}
                          >
                            <span className='font-mono text-[10px] font-normal tracking-[0.12em] text-accent sm:text-xs'>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className='flex-1'>{item.title}</span>
                            <span className='flex size-9 shrink-0 items-center justify-center sm:size-10'>
                              <ArrowUpRight className='size-6 text-accent transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 sm:size-7' />
                            </span>
                          </motion.a>
                        )}
                        {hasChildren && isExpanded && (
                          <motion.div
                            className='grid border-b border-white/15 py-3 sm:grid-cols-2 lg:hidden'
                            initial={
                              reduceMotion ? false : { opacity: 0, height: 0 }
                            }
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={
                              reduceMotion
                                ? undefined
                                : { opacity: 0, height: 0 }
                            }
                          >
                            {item.children?.map((child) => (
                              <MenuLink
                                key={child.id ?? child.url}
                                item={child}
                                href={resolveLandingUrl(child.url, pathname)}
                                onSelect={closeMenu}
                                className='border-b border-white/10 px-2 py-3 text-base font-semibold text-slate-300 transition-colors hover:text-accent sm:border-0 sm:text-lg'
                                isActive={matchesMenuRoute(child.url, pathname)}
                              />
                            ))}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {primaryItems.map((item, index) => {
                  const itemKey = item.id ?? item.url;
                  if (!item.children?.length || !expandedItems[itemKey]) {
                    return null;
                  }

                  return (
                    <motion.div
                      key={`desktop-${itemKey}`}
                      id={`desktop-submenu-${index}`}
                      className='hidden min-h-full flex-col justify-center border-l border-white/15 pl-10 lg:flex'
                      initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, x: 24 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className='grid min-h-full grid-cols-2 content-center'>
                        {item.children.map((child, childIndex) => (
                          <motion.div
                            key={child.id ?? child.url}
                            initial={
                              reduceMotion ? false : { opacity: 0, y: 18 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: reduceMotion ? 0 : childIndex * 0.06,
                              duration: 0.35,
                            }}
                          >
                            <MenuLink
                              item={child}
                              href={resolveLandingUrl(child.url, pathname)}
                              onSelect={closeMenu}
                              className='flex min-h-24 items-center border-b border-white/10 px-4 py-5 text-xl font-semibold text-slate-300 transition-colors hover:text-accent'
                              isActive={matchesMenuRoute(child.url, pathname)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.nav>

              <p className='mt-12 max-w-sm text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 lg:mt-24'>
                Hospitality 2035 · Die wirtschaftliche Zukunft der Hotellerie
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
