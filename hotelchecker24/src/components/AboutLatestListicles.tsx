import {
  WpLink,
  useWpQuery,
  useWpI18n,
  useWpPageLink,
  useWpMeta,
} from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';
import { ArrowRight, BookOpen } from 'lucide-react';

export const editable = pickEditable(berUnsPageEditable, {
  badge: 'latest_listicles_badge',
  heading: 'latest_listicles_heading',
  linkLabel: 'latest_listicles_link_label',
  mobileLinkLabel: 'latest_listicles_mobile_link_label',
});

export interface AboutLatestListiclesProps {
  badge?: string;
  heading?: string;
  linkLabel?: string;
  mobileLinkLabel?: string;
  setAttributes?: (attrs: Partial<AboutLatestListiclesProps>) => void;
}

/**
 * @forgewp-block
 * title: About Latest Listicles
 * category: theme
 * icon: admin-post
 * description: About-page "Aktuelle Berichte" strip (latest listicles grid).
 */
export function AboutLatestListicles({
  badge: badgeProp,
  heading: headingProp,
  linkLabel: linkLabelProp,
  mobileLinkLabel: mobileLinkLabelProp,
  setAttributes,
}: AboutLatestListiclesProps) {
  const { __ } = useWpI18n();
  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');
  const { posts: latestListicles, loading } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 3,
  });

  const badgeMeta = useWpMeta('latest_listicles_badge', defaults.latest_listicles_badge);
  const headingMeta = useWpMeta('latest_listicles_heading', defaults.latest_listicles_heading);
  const linkLabelMeta = useWpMeta('latest_listicles_link_label', defaults.latest_listicles_link_label);
  const mobileLinkLabelMeta = useWpMeta(
    'latest_listicles_mobile_link_label',
    defaults.latest_listicles_mobile_link_label,
  );

  const badge = badgeProp ?? badgeMeta;
  const heading = headingProp ?? headingMeta;
  const linkLabel = linkLabelProp ?? linkLabelMeta;
  const mobileLinkLabel = mobileLinkLabelProp ?? mobileLinkLabelMeta;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-xs"
            >
              <div className="h-44 bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (latestListicles.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-1 block">
            {setAttributes ? (
              <WpEditable tagName="span" value={badge} onChange={(val) => setAttributes({ badge: val })} />
            ) : (
              badge
            )}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900">
            {setAttributes ? (
              <WpEditable tagName="span" value={heading} onChange={(val) => setAttributes({ heading: val })} />
            ) : (
              heading
            )}
          </h2>
        </div>
        <WpLink
          href={listiclesHref}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors group"
        >
          {setAttributes ? (
            <WpEditable tagName="span" value={linkLabel} onChange={(val) => setAttributes({ linkLabel: val })} />
          ) : (
            linkLabel
          )}{' '}
          <ArrowRight className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-300" />
        </WpLink>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {latestListicles.map((listicle) => {
          const featuredUrl =
            typeof listicle.featuredImage === 'object' &&
            listicle.featuredImage !== null
              ? (listicle.featuredImage as { url?: string }).url || ''
              : String(listicle.featuredImage || '');
          const readTime = listicle.customFields?.read_time || '5';
          const catTerms: { slug: string; name: string }[] =
            (
              listicle as {
                _terms?: { category?: { slug: string; name: string }[] };
              }
            )._terms?.category || [];

          return (
            <WpLink
              key={listicle.id}
              href={listicle.permalink || `/hotelvergleich/${listicle.id}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <img
                  src={featuredUrl}
                  alt={listicle.title}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {catTerms.length > 0 && (
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10">
                    {catTerms.slice(0, 1).map((t) => (
                      <span
                        key={t.slug}
                        className="text-[10px] font-semibold bg-white/95 backdrop-blur-xs text-slate-700 px-2 py-0.5 rounded-md shadow-xs"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-xs text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs z-10">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span>
                    {readTime} {__('Min.')}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col grow">
                <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm leading-snug line-clamp-2 grow mb-4">
                  {listicle.title}
                </h3>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    {__('Artikel lesen')}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-rotate-45 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </WpLink>
          );
        })}
      </div>
      <div className="text-center mt-6 sm:hidden">
        <WpLink
          href={listiclesHref}
          className="inline-flex items-center gap-2 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl"
        >
          {setAttributes ? (
            <WpEditable
              tagName="span"
              value={mobileLinkLabel}
              onChange={(val) => setAttributes({ mobileLinkLabel: val })}
            />
          ) : (
            mobileLinkLabel
          )}{' '}
          <ArrowRight className="w-4 h-4" />
        </WpLink>
      </div>
    </div>
  );
}

export default AboutLatestListicles;
