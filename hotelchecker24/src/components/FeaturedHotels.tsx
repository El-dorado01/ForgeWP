import { ArrowRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as frontPageEditable, defaults } from '../../cms/editables/front-page';
import { FeaturedHotelsGrid } from './FeaturedHotelsGrid';

/** Page content from ACF + block-only layout (padding never on page ACF). */
export const editable = pickEditable(frontPageEditable, {
    badge: 'featured_badge',
    heading: 'featured_heading',
    subtitle: 'featured_subtitle',
    linkLabel: 'featured_link_label',
  });


export interface FeaturedHotelsProps {
  badge?: string;
  heading?: string;
  subtitle?: string;
  linkLabel?: string;
  /** Block-only layout attribute */
  setAttributes?: (attrs: Partial<FeaturedHotelsProps>) => void;
}

/**
 * @forgewp-block
 * title: Featured Hotels
 * category: theme
 * icon: admin-home
 * description: Curated featured hotels section heading + grid.
 */
export function FeaturedHotels({
  badge: badgeProp,
  heading: headingProp,
  subtitle: subtitleProp,
  linkLabel: linkProp,
  setAttributes,
}: FeaturedHotelsProps) {
  const badgeMeta = useWpMeta('featured_badge', defaults.featured_badge);
  const headingMeta = useWpMeta('featured_heading', defaults.featured_heading);
  const subtitleMeta = useWpMeta('featured_subtitle', defaults.featured_subtitle);
  const linkMeta = useWpMeta('featured_link_label', defaults.featured_link_label);

  const badge = badgeProp ?? badgeMeta;
  const heading = headingProp ?? headingMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const linkLabel = linkProp ?? linkMeta;

  const hotelsHref = useWpPageLink('hotels-page', '/hotels');

  return (
    <section className='w-full py-8 sm:py-10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-end justify-between mb-10'>
          <div>
            <span className='text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full'>
              {setAttributes ? (
                <WpEditable tagName='span' value={badge} onChange={(val) => setAttributes({ badge: val })} />
              ) : (
                badge
              )}
            </span>
            <h2 className='text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3'>
              {setAttributes ? (
                <WpEditable tagName='span' value={heading} onChange={(val) => setAttributes({ heading: val })} />
              ) : (
                heading
              )}
            </h2>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={subtitle}
                onChange={(val) => setAttributes({ subtitle: val })}
                className='text-slate-500 text-sm mt-1 max-w-md'
              />
            ) : (
              <p className='text-slate-500 text-sm mt-1 max-w-md'>{subtitle}</p>
            )}
          </div>
          <WpLink
            href={hotelsHref}
            className='hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors'
          >
            {setAttributes ? (
              <WpEditable tagName='span' value={linkLabel} onChange={(val) => setAttributes({ linkLabel: val })} />
            ) : (
              linkLabel
            )}
            <ArrowRight className='w-3.5 h-3.5' />
          </WpLink>
        </div>

        <FeaturedHotelsGrid />
      </div>
    </section>
  );
}

export default FeaturedHotels;
