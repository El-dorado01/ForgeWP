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
import { WpQueryLoop, useWpTitle, useWpExcerpt, useWpFeaturedImage } from "../../.forgewp/wordpress";

export function ServicesPage() {
  return (
    <main className="container mx-auto px-6 py-12">
      {/* Dynamic SEO Injector */}
      <SEO 
        title="Services" 
        description="Explore our exclusive Services section, dynamically loaded in Headless React." 
      />

      {/* Hero Header Area */}
      <header className="border-b-4 border-black pb-6 mb-12">
        <h1 className="text-5xl font-black tracking-tight uppercase">Services</h1>
        <p className="text-zinc-500 mt-2 text-lg">
          Auto-generated template. Edit <code className="bg-zinc-100 px-1 py-0.5 rounded text-sm text-red-600 font-mono">src/app/pages/ServicesPage.tsx</code> to customize this page.
        </p>
      </header>

      {/* Grid Starter - WordPress Mock Loop */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <WpQueryLoop postType="post" postsPerPage={3}>
          <article className="border-2 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="w-full h-48 bg-zinc-100 mb-4 border border-zinc-200 overflow-hidden">
              <img 
                src={useWpFeaturedImage()} 
                alt={useWpTitle()} 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight mb-2">
              {useWpTitle()}
            </h2>
            <p className="text-zinc-600 text-sm mb-4">
              {useWpExcerpt()}
            </p>
            <a 
              href="#" 
              className="inline-block px-4 py-2 border-2 border-black bg-zinc-100 font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors"
            >
              Read More
            </a>
          </article>
        </WpQueryLoop>
      </section>
    </main>
  );
}
