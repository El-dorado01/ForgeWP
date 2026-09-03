import { ChevronRight, MessageSquare, MapPin } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta, useWpI18n } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as kontaktPageEditable, defaults } from '../../cms/editables/kontakt-page';


export const editable = pickEditable(kontaktPageEditable, {
    badge: 'hero_badge',
    title: 'hero_title',
    subtitle: 'hero_subtitle',
    cardImage: 'card_image',
    cardBadge: 'card_badge',
  });


export interface ContactHeroProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  cardImage?: string;
  cardBadge?: string;
  setAttributes?: (attrs: Partial<ContactHeroProps>) => void;
}

/**
 * @forgewp-block
 * title: Contact Hero
 * category: theme
 * icon: email
 * description: Contact page hero with breadcrumb and visual card.
 */
export function ContactHero({
  badge: badgeProp,
  title: titleProp,
  subtitle: subtitleProp,
  cardImage: cardImageProp,
  cardBadge: cardBadgeProp,
  setAttributes,
}: ContactHeroProps) {
  const { __ } = useWpI18n();
  const homeHref = useWpPageLink('front-page', '/');

  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const cardImageMeta = useWpMeta('card_image', defaults.card_image);
  const cardBadgeMeta = useWpMeta('card_badge', defaults.card_badge);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const cardImage = (cardImageProp && (cardImageProp as any).url) || cardImageProp || cardImageMeta || '';
  const cardBadge = cardBadgeProp ?? cardBadgeMeta;

  return (
    <div className='relative overflow-hidden bg-slate-50 w-full py-8 sm:py-10'>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0">
          <WpLink
            href={homeHref}
            className="hover:text-primary transition-colors whitespace-nowrap shrink-0"
          >
            {__('Startseite')}
          </WpLink>
          <ChevronRight className="w-4 h-4 shrink-0" />
          <span className="text-slate-700 truncate min-w-0">{__('Kontakt')}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              {setAttributes ? (
                <WpEditable
                  tagName="span"
                  value={badge}
                  onChange={(val) => setAttributes({ badge: val })}
                />
              ) : (
                badge
              )}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
              {setAttributes ? (
                <WpEditable
                  tagName="span"
                  value={title}
                  onChange={(val) => setAttributes({ title: val })}
                />
              ) : (
                title
              )}
            </h1>
            {setAttributes ? (
              <WpEditable
                tagName="p"
                value={subtitle}
                onChange={(val) => setAttributes({ subtitle: val })}
                className="text-slate-500 text-sm sm:text-base leading-relaxed"
              />
            ) : (
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center h-[200px] select-none">
            <div className="relative w-72 h-44 rounded-2xl overflow-hidden shadow-xl rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
              <img
                src={cardImage}
                alt={__('Wien Redaktion')}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {setAttributes ? (
                  <WpEditable
                    tagName="span"
                    value={cardBadge}
                    onChange={(val) => setAttributes({ cardBadge: val })}
                  />
                ) : (
                  <span>{cardBadge}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactHero;
