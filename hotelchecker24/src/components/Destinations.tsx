import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '../.forgewp/wordpress';
import { editable as frontPageEditable, defaults } from '../../cms/editables/front-page';
import { DestinationsGrid } from './DestinationsGrid';

/** Page content from ACF. paddingY/paddingX ship on every block automatically. */
export const editable = pickEditable(frontPageEditable, {
    heading: 'destinations_heading',
    subtitle: 'destinations_subtitle',
  });


export interface DestinationsProps {
  heading?: string;
  subtitle?: string;
  setAttributes?: (attrs: Partial<DestinationsProps>) => void;
}

/**
 * @forgewp-block
 * title: Destinations
 * category: theme
 * icon: location-alt
 * description: Destination countries list with post counts.
 */
export function Destinations({
  heading: headingProp,
  subtitle: subtitleProp,
  setAttributes,
}: DestinationsProps) {
  const headingMeta = useWpMeta('destinations_heading', defaults.destinations_heading);
  const subtitleMeta = useWpMeta('destinations_subtitle', defaults.destinations_subtitle);

  const heading = headingProp ?? headingMeta;
  const subtitle = subtitleProp ?? subtitleMeta;

  return (
    <section className='w-full py-8 sm:py-10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-10'>
          <h2 className='text-3xl font-sans font-black text-slate-800 uppercase tracking-tight'>
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
              className='text-slate-500 text-sm mt-2'
            />
          ) : (
            <p className='text-slate-500 text-sm mt-2'>{subtitle}</p>
          )}
        </div>
        <DestinationsGrid />
      </div>
    </section>
  );
}

export default Destinations;
