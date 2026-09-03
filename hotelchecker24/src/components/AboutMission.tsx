import { BookOpen, ArrowRight } from 'lucide-react';
import { useWpPageLink, WpLink, useWpMeta } from '@forgewp/react';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';

/** Page ACF + block-only padding (none on baked page — parent grid supplies spacing). */
export const editable = pickEditable(berUnsPageEditable, {
    badge: 'mission_badge',
    title: 'mission_title',
    content: 'mission_content',
    ctaLabel: 'mission_cta_label',
  });

/** Baked page: no own py (shared grid wrapper). Blocks: use attribute / default. */

export interface AboutMissionProps {
  badge?: string;
  title?: string;
  content?: string;
  ctaLabel?: string;
  setAttributes?: (attrs: Partial<AboutMissionProps>) => void;
}

/**
 * @forgewp-block
 * title: About Mission
 * category: theme
 * icon: text-page
 * description: Editorial mission statement (About page section).
 */
export function AboutMission({
  badge: badgeProp,
  title: titleProp,
  content: contentProp,
  ctaLabel: ctaProp,
  setAttributes,
}: AboutMissionProps) {
  const badgeMeta = useWpMeta('mission_badge', defaults.mission_badge);
  const titleMeta = useWpMeta('mission_title', defaults.mission_title);
  const contentMeta = useWpMeta('mission_content', defaults.mission_content);
  const ctaMeta = useWpMeta('mission_cta_label', defaults.mission_cta_label);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const content = contentProp ?? contentMeta;
  const ctaLabel = ctaProp ?? ctaMeta;

  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');

  return (
    <div className='max-w-2xl w-full min-w-0'>
      {setAttributes ? (
        <WpEditable
          tagName='span'
          value={badge}
          onChange={(val) => setAttributes({ badge: val })}
          className='text-xs font-semibold uppercase tracking-widest text-primary mb-3 block'
        />
      ) : (
        <span className='text-xs font-semibold uppercase tracking-widest text-primary mb-3 block'>
          {badge}
        </span>
      )}
      <h2 className='text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900 leading-tight mb-5 whitespace-pre-line'>
        {setAttributes ? (
          <WpEditable tagName='span' value={title} onChange={(val) => setAttributes({ title: val })} />
        ) : (
          title
        )}
      </h2>
      {setAttributes ? (
        <WpEditable
          tagName='div'
          value={content}
          onChange={(val) => setAttributes({ content: val })}
          className='space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed'
        />
      ) : (
        <div
          className='space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed'
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}

      <WpLink
        href={listiclesHref}
        className='inline-flex items-center gap-2 mt-6 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer group'
      >
        <BookOpen className='w-4 h-4' />
        {setAttributes ? (
          <WpEditable tagName='span' value={ctaLabel} onChange={(val) => setAttributes({ ctaLabel: val })} />
        ) : (
          ctaLabel
        )}
        <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
      </WpLink>
    </div>
  );
}

export default AboutMission;
