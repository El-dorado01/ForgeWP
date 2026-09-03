import { MapPin } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';

export const editable = pickEditable(berUnsPageEditable, {
    heading: 'cta_heading',
    headingColored: 'cta_heading_colored',
    headingEnd: 'cta_heading_end',
    subtitle: 'cta_subtitle',
    primaryLabel: 'cta_primary_label',
    secondaryLabel: 'cta_secondary_label',
  });


export interface AboutCtaProps {
  heading?: string;
  headingColored?: string;
  headingEnd?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  setAttributes?: (attrs: Partial<AboutCtaProps>) => void;
}

/**
 * @forgewp-block
 * title: About CTA Strip
 * category: theme
 * icon: megaphone
 * description: Dark closing CTA strip (About page section).
 */
export function AboutCta({
  heading: headingProp,
  headingColored: coloredProp,
  headingEnd: endProp,
  subtitle: subtitleProp,
  primaryLabel: primaryProp,
  secondaryLabel: secondaryProp,
  setAttributes,
}: AboutCtaProps) {
  const headingMeta = useWpMeta('cta_heading', defaults.cta_heading);
  const coloredMeta = useWpMeta('cta_heading_colored', defaults.cta_heading_colored);
  const endMeta = useWpMeta('cta_heading_end', defaults.cta_heading_end);
  const subtitleMeta = useWpMeta('cta_subtitle', defaults.cta_subtitle);
  const primaryMeta = useWpMeta('cta_primary_label', defaults.cta_primary_label);
  const secondaryMeta = useWpMeta('cta_secondary_label', defaults.cta_secondary_label);

  const heading = headingProp ?? headingMeta;
  const headingColored = coloredProp ?? coloredMeta;
  const headingEnd = endProp ?? endMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const primaryLabel = primaryProp ?? primaryMeta;
  const secondaryLabel = secondaryProp ?? secondaryMeta;

  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  const contactHref = useWpPageLink('kontakt-page', '/contact');

  return (
    <div className='relative overflow-hidden bg-[#121416] text-white w-full py-12 sm:py-16'>
      <div className='absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(109,155,174,0.20)_0%,transparent_70%)] blur-[100px] pointer-events-none' />
      <div className='absolute -top-20 -left-20 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(146,159,93,0.16)_0%,transparent_70%)] blur-[80px] pointer-events-none' />

      <div className='relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10'>
        <h2 className='text-3xl sm:text-4xl font-black tracking-tight uppercase mb-3'>
          {setAttributes ? (
            <>
              <WpEditable tagName='span' value={heading} onChange={(val) => setAttributes({ heading: val })} />{' '}
              <span className='text-primary'>
                <WpEditable
                  tagName='span'
                  value={headingColored}
                  onChange={(val) => setAttributes({ headingColored: val })}
                />
              </span>
              <br />
              <WpEditable tagName='span' value={headingEnd} onChange={(val) => setAttributes({ headingEnd: val })} />
            </>
          ) : (
            <>
              {heading} <span className='text-primary'>{headingColored}</span>
              <br />
              {headingEnd}
            </>
          )}
        </h2>
        {setAttributes ? (
          <WpEditable
            tagName='p'
            value={subtitle}
            onChange={(val) => setAttributes({ subtitle: val })}
            className='text-[#b3b8bc] text-sm mb-8 max-w-xl mx-auto'
          />
        ) : (
          <p className='text-[#b3b8bc] text-sm mb-8 max-w-xl mx-auto'>{subtitle}</p>
        )}
        <div className='flex flex-wrap items-center justify-center gap-4'>
          <WpLink
            href={hotelsHref}
            className='relative overflow-hidden inline-flex items-center justify-center bg-primary text-white font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-colors duration-500 group select-none shadow-none cursor-pointer active:scale-95 shrink-0 hover:bg-primary/90'
          >
            <span className='relative z-10 flex items-center gap-2'>
              <MapPin className='w-4 h-4' />
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={primaryLabel}
                  onChange={(val) => setAttributes({ primaryLabel: val })}
                />
              ) : (
                primaryLabel
              )}
            </span>
          </WpLink>
          <WpLink
            href={contactHref}
            className='inline-flex items-center gap-2 bg-white/8 hover:bg-white/15 text-white font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all cursor-pointer'
          >
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={secondaryLabel}
                onChange={(val) => setAttributes({ secondaryLabel: val })}
              />
            ) : (
              secondaryLabel
            )}
          </WpLink>
        </div>
      </div>
    </div>
  );
}

export default AboutCta;
