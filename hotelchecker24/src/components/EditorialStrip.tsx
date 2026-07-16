import { ArrowRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta } from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as frontPageEditable, defaults } from '../../cms/editables/front-page';

/** Page content from ACF + block-only layout (padding never on page ACF). */
export const editable = pickEditable(frontPageEditable, {
    badge: 'editorial_badge',
    heading: 'editorial_heading',
    headingColored: 'editorial_heading_colored',
    description: 'editorial_description',
    ctaLabel: 'editorial_cta_label',
    feature1Label: 'editorial_feature1_label',
    feature1Desc: 'editorial_feature1_desc',
    feature2Label: 'editorial_feature2_label',
    feature2Desc: 'editorial_feature2_desc',
    feature3Label: 'editorial_feature3_label',
    feature3Desc: 'editorial_feature3_desc',
    feature4Label: 'editorial_feature4_label',
    feature4Desc: 'editorial_feature4_desc',
  });


export interface EditorialStripProps {
  badge?: string;
  heading?: string;
  headingColored?: string;
  description?: string;
  ctaLabel?: string;
  feature1Label?: string;
  feature1Desc?: string;
  feature2Label?: string;
  feature2Desc?: string;
  feature3Label?: string;
  feature3Desc?: string;
  feature4Label?: string;
  feature4Desc?: string;
  setAttributes?: (attrs: Partial<EditorialStripProps>) => void;
}

/**
 * @forgewp-block
 * title: Editorial Strip
 * category: theme
 * icon: admin-post
 * description: An editorial value proposition banner with feature highlight cards.
 *
 * Flat feature fields (not a map) — block editor can't statically compile inline .map().
 */
export function EditorialStrip({
  badge: badgeProp,
  heading: headingProp,
  headingColored: headingColoredProp,
  description: descriptionProp,
  ctaLabel: ctaLabelProp,
  feature1Label: f1lProp,
  feature1Desc: f1dProp,
  feature2Label: f2lProp,
  feature2Desc: f2dProp,
  feature3Label: f3lProp,
  feature3Desc: f3dProp,
  feature4Label: f4lProp,
  feature4Desc: f4dProp,
  setAttributes,
}: EditorialStripProps) {
  const badgeMeta = useWpMeta('editorial_badge', defaults.editorial_badge);
  const headingMeta = useWpMeta('editorial_heading', defaults.editorial_heading);
  const headingColoredMeta = useWpMeta(
    'editorial_heading_colored',
    defaults.editorial_heading_colored,
  );
  const descriptionMeta = useWpMeta('editorial_description', defaults.editorial_description);
  const ctaLabelMeta = useWpMeta('editorial_cta_label', defaults.editorial_cta_label);
  const f1lMeta = useWpMeta('editorial_feature1_label', defaults.editorial_feature1_label);
  const f1dMeta = useWpMeta('editorial_feature1_desc', defaults.editorial_feature1_desc);
  const f2lMeta = useWpMeta('editorial_feature2_label', defaults.editorial_feature2_label);
  const f2dMeta = useWpMeta('editorial_feature2_desc', defaults.editorial_feature2_desc);
  const f3lMeta = useWpMeta('editorial_feature3_label', defaults.editorial_feature3_label);
  const f3dMeta = useWpMeta('editorial_feature3_desc', defaults.editorial_feature3_desc);
  const f4lMeta = useWpMeta('editorial_feature4_label', defaults.editorial_feature4_label);
  const f4dMeta = useWpMeta('editorial_feature4_desc', defaults.editorial_feature4_desc);

  const badge = badgeProp ?? badgeMeta;
  const heading = headingProp ?? headingMeta;
  const headingColored = headingColoredProp ?? headingColoredMeta;
  const description = descriptionProp ?? descriptionMeta;
  const ctaLabel = ctaLabelProp ?? ctaLabelMeta;
  const feature1Label = f1lProp ?? f1lMeta;
  const feature1Desc = f1dProp ?? f1dMeta;
  const feature2Label = f2lProp ?? f2lMeta;
  const feature2Desc = f2dProp ?? f2dMeta;
  const feature3Label = f3lProp ?? f3lMeta;
  const feature3Desc = f3dProp ?? f3dMeta;
  const feature4Label = f4lProp ?? f4lMeta;
  const feature4Desc = f4dProp ?? f4dMeta;

  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');

  return (
    <section className='w-full py-8 sm:py-10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='bg-[#121416] rounded-3xl overflow-hidden px-8 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(146,159,93,0.15)_0%,transparent_60%)] pointer-events-none' />
        <div className='relative z-10'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-md inline-block mb-4'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={badge}
                onChange={(val) => setAttributes({ badge: val })}
              />
            ) : (
              badge
            )}
          </span>
          <h2 className='text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={heading}
                onChange={(val) => setAttributes({ heading: val })}
              />
            ) : (
              heading
            )}
            <br />
            <span className='text-[#929f5d]'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={headingColored}
                  onChange={(val) => setAttributes({ headingColored: val })}
                />
              ) : (
                headingColored
              )}
            </span>
          </h2>
          {setAttributes ? (
            <WpEditable
              tagName='p'
              value={description}
              onChange={(val) => setAttributes({ description: val })}
              className='text-slate-400 text-sm leading-relaxed mb-6 max-w-sm'
            />
          ) : (
            <p className='text-slate-400 text-sm leading-relaxed mb-6 max-w-sm'>{description}</p>
          )}
          <WpLink
            href={listiclesHref}
            className='inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all duration-300 active:scale-95'
          >
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={ctaLabel}
                onChange={(val) => setAttributes({ ctaLabel: val })}
              />
            ) : (
              ctaLabel
            )}
            <ArrowRight className='w-3.5 h-3.5' />
          </WpLink>
        </div>
        <div className='relative z-10 grid grid-cols-2 gap-3'>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <span className='text-[10px] font-mono font-black text-[#929f5d]'>01</span>
            <p className='text-white text-xs font-bold uppercase tracking-wide mt-1'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={feature1Label}
                  onChange={(val) => setAttributes({ feature1Label: val })}
                />
              ) : (
                feature1Label
              )}
            </p>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={feature1Desc}
                onChange={(val) => setAttributes({ feature1Desc: val })}
                className='text-slate-500 text-[10px] mt-1 leading-snug'
              />
            ) : (
              <p className='text-slate-500 text-[10px] mt-1 leading-snug'>{feature1Desc}</p>
            )}
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <span className='text-[10px] font-mono font-black text-[#929f5d]'>02</span>
            <p className='text-white text-xs font-bold uppercase tracking-wide mt-1'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={feature2Label}
                  onChange={(val) => setAttributes({ feature2Label: val })}
                />
              ) : (
                feature2Label
              )}
            </p>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={feature2Desc}
                onChange={(val) => setAttributes({ feature2Desc: val })}
                className='text-slate-500 text-[10px] mt-1 leading-snug'
              />
            ) : (
              <p className='text-slate-500 text-[10px] mt-1 leading-snug'>{feature2Desc}</p>
            )}
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <span className='text-[10px] font-mono font-black text-[#929f5d]'>03</span>
            <p className='text-white text-xs font-bold uppercase tracking-wide mt-1'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={feature3Label}
                  onChange={(val) => setAttributes({ feature3Label: val })}
                />
              ) : (
                feature3Label
              )}
            </p>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={feature3Desc}
                onChange={(val) => setAttributes({ feature3Desc: val })}
                className='text-slate-500 text-[10px] mt-1 leading-snug'
              />
            ) : (
              <p className='text-slate-500 text-[10px] mt-1 leading-snug'>{feature3Desc}</p>
            )}
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-4'>
            <span className='text-[10px] font-mono font-black text-[#929f5d]'>04</span>
            <p className='text-white text-xs font-bold uppercase tracking-wide mt-1'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={feature4Label}
                  onChange={(val) => setAttributes({ feature4Label: val })}
                />
              ) : (
                feature4Label
              )}
            </p>
            {setAttributes ? (
              <WpEditable
                tagName='p'
                value={feature4Desc}
                onChange={(val) => setAttributes({ feature4Desc: val })}
                className='text-slate-500 text-[10px] mt-1 leading-snug'
              />
            ) : (
              <p className='text-slate-500 text-[10px] mt-1 leading-snug'>{feature4Desc}</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

export default EditorialStrip;
