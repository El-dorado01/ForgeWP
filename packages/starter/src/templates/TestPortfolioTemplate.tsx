import { WpQueryLoop, useWpTitle, useWpFeaturedImage, useWpExcerpt, useWpPermalink, useWpCustomField } from "@/.forgewp/wordpress";

/**
 * ⚡ ForgeWP Custom Post Type Template — "TestPortfolioTemplate"
 * 
 * This loop template dynamically queries and renders records of the "portfolio" post type.
 * In local development, the post data and custom fields are fetched dynamically from
 * your local JSON database file at: `cms/mock-data.json`.
 */
export default function TestPortfolioTemplate() {
  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-brand selection:text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Brutalist Header Banner */}
        <div className="mb-12 border-4 border-zinc-950 bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 mb-4 border-2 border-zinc-950">
            Loop Template
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-zinc-950">
            Latest Portfolio Feed
          </h1>
          <p className="text-sm font-mono font-medium text-zinc-600 mt-2">
            Dynamic Post-Type Template &bull; Querying: "portfolio"
          </p>
        </div>

        {/* Post Grid Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <WpQueryLoop postType="portfolio" postsPerPage={6}>
            <article className="bg-white border-4 border-zinc-950 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <div>
                <div className="relative aspect-video w-full border-2 border-zinc-950 overflow-hidden mb-4 bg-zinc-100">
                  <img 
                    src={useWpFeaturedImage()} 
                    alt={useWpTitle()} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight leading-none mb-3 hover:text-brand transition-colors">
                  <a href={useWpPermalink()}>{useWpTitle()}</a>
                </h3>
                <p className="text-sm text-zinc-600 font-sans leading-relaxed mb-6">
                  {useWpExcerpt()}
                </p>
              </div>

              <div className="space-y-2 mt-auto">
            <div className="flex justify-between border-t border-zinc-950 pt-2 text-xs font-mono text-zinc-700">
              <span>Client Name:</span>
              <span className="font-bold">{useWpCustomField("client_name")}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-950 pt-2 text-xs font-mono text-zinc-700">
              <span>Project Budget:</span>
              <span className="font-bold">{useWpCustomField("project_budget")}</span>
            </div>
              </div>
            </article>
          </WpQueryLoop>
        </div>
      </div>
    </div>
  );
}
