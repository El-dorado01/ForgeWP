import { WpQueryLoop, useWpTitle, useWpFeaturedImage, useWpExcerpt, useWpPermalink, useWpCustomField } from "@/.forgewp/wordpress";

/**
 * ⚡ ForgeWP Custom Post Type Template — "HotelsTemplate"
 * 
 * This loop template dynamically queries and renders records of the "hotel" post type.
 * In local development, the post data and custom fields are fetched dynamically from
 * your local JSON database file at: `cms/mock-data.json`.
 */
export default function HotelsTemplate() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Banner */}
        <div className="mb-12 border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50">
          <span className="inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 mb-4">
            Loop Template
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
            Latest Hotel Feed
          </h1>
          <p className="text-sm font-mono font-medium text-slate-500 mt-2">
            Dynamic Post-Type Template &bull; Querying: "hotel"
          </p>
        </div>

        {/* Post Grid Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <WpQueryLoop postType="hotel" postsPerPage={6}>
            <article className="bg-white border border-slate-100 p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-none flex flex-col justify-between">
              <div>
                <div className="relative aspect-video w-full border border-slate-100 overflow-hidden mb-4 bg-slate-50/50">
                  <img 
                    src={useWpFeaturedImage()} 
                    alt={useWpTitle()} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3 hover:text-primary transition-colors">
                  <a href={useWpPermalink()}>{useWpTitle()}</a>
                </h3>
                <p className="text-sm text-slate-500 font-sans leading-relaxed mb-6">
                  {useWpExcerpt()}
                </p>
              </div>

              <div className="space-y-2 mt-auto">
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>Rating:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("rating")}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>Location:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("location")}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>Stars:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("stars")}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>Featured:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("featured")}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>City:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("city")}</span>
            </div>
              </div>
            </article>
          </WpQueryLoop>
        </div>
      </div>
    </div>
  );
}
