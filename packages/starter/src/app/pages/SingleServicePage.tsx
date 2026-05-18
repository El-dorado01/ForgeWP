/**
 * ⚡ Auto-Generated Page Component by ForgeWP
 * 
 * This file was generated automatically from your sitemap configuration (wordpress/menus.json).
 * You can safely edit this file to customize the visual layout, styles, and logic.
 * Subsequent runs of 'pnpm forgewp sync:routes' will NOT overwrite your changes.
 * 
 * To force reset this page back to boilerplate defaults, run:
 * 'pnpm forgewp sync:routes --force'
 */
import { SEO } from "../../.forgewp/SEO";
import { Navbar } from "@/components/ui/navbar";
import { WpQueryLoop, useWpTitle, useWpContent, useWpFeaturedImage, useWpCustomField, useWpDate, useWpAuthor } from "../../.forgewp/wordpress";

function SingleServiceTemplate() {
  return (
    <article className="max-w-4xl mx-auto px-6 py-12">
      {/* Dynamic SEO Injector for Single Template */}
      <SEO 
        title={useWpTitle()} 
        description={`Read more about our ${useWpTitle()} capability.`} 
      />

      {/* Hero Header Area */}
      <header className="border-b-4 border-zinc-950 pb-8 mb-12">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{useWpCustomField("icon", "⚡")}</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase text-zinc-950 leading-none">
            {useWpTitle()}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 font-mono text-xs uppercase tracking-wider font-bold">
          <span>{useWpDate()}</span>
          <span>//</span>
          <span>By {useWpAuthor()}</span>
          <span>//</span>
          <span className="bg-brand text-white px-2 py-1">SERVICE TEMPLATE</span>
        </div>
      </header>

      {/* Featured Image */}
      <div className="w-full h-64 md:h-96 bg-zinc-100 mb-12 border-4 border-zinc-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <img 
          src={useWpFeaturedImage()} 
          alt="Service Hero" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Dynamic WordPress Content */}
      <div className="prose prose-zinc max-w-none prose-h2:font-black prose-h2:uppercase prose-h2:text-3xl prose-p:font-semibold prose-p:text-zinc-700">
        <div dangerouslySetInnerHTML={{ __html: useWpContent() }} />
      </div>

      {/* Footer CTA */}
      <div className="mt-16 pt-8 border-t-4 border-zinc-950 text-center">
        <a href="/" className="inline-block border-2 border-zinc-950 bg-white text-zinc-950 font-bold uppercase tracking-wider text-sm px-6 py-3 hover:bg-zinc-950 hover:text-white transition-colors">
          ← Back to Capabilities
        </a>
      </div>
    </article>
  );
}

export function SingleServicePage({ params }: { params?: { id: string } }) {
  const postId = params?.id ? parseInt(params.id, 10) : 1;
  return (
    <div className="min-h-screen bg-bg-light">
      <Navbar />
      
      {/* For local dev, we mock the single page by filtering the loop to exactly 1 post ID */}
      <WpQueryLoop postType="service" postsPerPage={1} postId={postId}>
        <SingleServiceTemplate />
      </WpQueryLoop>
    </div>
  );
}
