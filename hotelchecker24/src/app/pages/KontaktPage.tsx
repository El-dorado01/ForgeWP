/**
 * ⚡ Auto-Generated Page Component by ForgeWP
 * 
 * This file was generated automatically from your sitemap configuration (cms/menus.json).
 * You can safely edit this file to customize the visual layout, styles, and logic.
 * Subsequent runs of 'pnpm forgewp sync:routes' will NOT overwrite your changes.
 * 
 * To force reset this page back to boilerplate defaults, run:
 * 'pnpm forgewp sync:routes --force'
 */
import { WpHead } from "../../.forgewp/wordpress";
import { WpQueryLoop, useWpTitle, useWpExcerpt, useWpFeaturedImage } from "../../.forgewp/wordpress";

export function KontaktPage() {
  return (
    <main className="container mx-auto px-6 py-12 font-sans text-slate-900">
      {/* WordPress SEO — compiles to native <meta> tags in your theme header */}
      <WpHead 
        title="Kontakt" 
        description="Explore our exclusive Kontakt section, dynamically loaded in Headless React." 
      />

      {/* Hero Header Area */}
      <header className="border-b border-slate-100 pb-6 mb-12">
        <h1 className="text-5xl font-black tracking-tight uppercase text-slate-900">Kontakt</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Auto-generated template. Edit <code className="bg-slate-50 px-1 py-0.5 border border-slate-100 text-xs text-primary font-mono">src/app/pages/KontaktPage.tsx</code> to customize this page.
        </p>
      </header>

      {/* Grid Starter - WordPress Mock Loop */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <WpQueryLoop postType="post" postsPerPage={3}>
          <article className="border border-slate-100 p-6 bg-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-none flex flex-col justify-between">
            <div>
              <div className="w-full h-48 bg-slate-50/50 mb-4 border border-slate-100 overflow-hidden">
                <img 
                  src={useWpFeaturedImage()} 
                  alt={useWpTitle()} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight mb-2 text-slate-900">
                {useWpTitle()}
              </h2>
              <p className="text-slate-500 text-sm mb-4">
                {useWpExcerpt()}
              </p>
            </div>
            <a 
              href="#" 
              className="inline-block px-4 py-2 border border-primary bg-primary text-white font-bold uppercase text-[10px] tracking-wider hover:bg-transparent hover:text-primary transition-colors cursor-pointer text-center"
            >
              Read More
            </a>
          </article>
        </WpQueryLoop>
      </section>
    </main>
  );
}
