import { SEO } from "../lib/SEO";
import wpConfig from "../../wp.config";
import { useWpCustomField, WpMenu, WpQueryLoop } from "../lib/wordpress";

export default function HomePage() {
  const colors = wpConfig.settings?.color?.palette || [];
  const fontFamilies = wpConfig.settings?.typography?.fontFamilies || [];
  const googleFonts = wpConfig.settings?.typography?.googleFonts || [];
  const layout = wpConfig.settings?.layout || {};

  return (
    <div className="min-h-screen bg-bg-light p-6 md:p-12 font-sans selection:bg-brand selection:text-white">
      <SEO
        title="ForgeWP Starter — React & Tailwind CSS for WordPress"
        description="A premium, sharp-edge developer framework for creating modern block-themes using React."
      />

      {/* Main Container — Sharp brutalist outer grid */}
      <main className="mx-auto max-w-6xl border-4 border-zinc-950 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header Grid Bar */}
        <header className="flex flex-col sm:flex-row items-stretch border-b-4 border-zinc-950">
          <div className="bg-brand text-white px-6 py-6 flex items-center border-b-4 sm:border-b-0 sm:border-r-4 border-zinc-950 font-black tracking-wider text-xl uppercase select-none">
            ⚡ FORGEWP
          </div>
          <div className="flex-1 px-6 py-4 flex items-center text-xs md:text-sm font-semibold text-zinc-600 font-mono tracking-tight bg-zinc-50">
            theme-compiler://v{wpConfig.version} // status: online
          </div>
          <div className="px-6 py-4 border-t-4 sm:border-t-0 sm:border-l-4 border-zinc-950 flex items-center bg-accent font-black text-sm uppercase tracking-wide text-zinc-950 select-none">
            Developer Console
          </div>
        </header>

        {/* Hero Section */}
        <section className="grid md:grid-cols-12 border-b-4 border-zinc-950">
          <div className="md:col-span-8 p-8 md:p-12 flex flex-col justify-center border-b-4 md:border-b-0 md:border-r-4 border-zinc-950">
            <span className="inline-block bg-zinc-950 text-white text-xs font-bold font-mono tracking-widest px-3 py-1 uppercase max-w-fit mb-6 select-none">
              v{wpConfig.version} Active
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight leading-none text-zinc-950">
              React structure.<br />
              Tailwind speed.<br />
              WordPress power.
            </h1>
            <p className="mt-6 text-base md:text-lg text-zinc-700 leading-relaxed font-sans font-medium max-w-xl">
              Welcome to the next generation of WordPress theme development. Build your layout dynamically using standard React components, mock hooks, and modern utilities. 
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://forgewp.dev/docs"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-center justify-center border-2 border-zinc-950 bg-zinc-950 text-white font-bold text-sm tracking-wider uppercase px-6 py-3 transition-colors hover:bg-brand hover:text-white"
              >
                Read Framework Docs
              </a>
              <a
                href="#tokens"
                className="group relative inline-flex items-center justify-center border-2 border-zinc-950 bg-white text-zinc-950 font-bold text-sm tracking-wider uppercase px-6 py-3 transition-all hover:bg-zinc-100"
              >
                Inspect Config Settings
              </a>
            </div>
          </div>

          {/* Quick Stats sidebar */}
          <div className="md:col-span-4 bg-zinc-50 p-8 flex flex-col justify-between font-mono text-xs">
            <div className="space-y-6">
              <div className="border-b-2 border-zinc-200 pb-4">
                <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Theme Name</span>
                <span className="text-sm font-black text-zinc-900">{wpConfig.name}</span>
              </div>
              <div className="border-b-2 border-zinc-200 pb-4">
                <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Theme Slug</span>
                <span className="text-sm font-black text-zinc-900">{wpConfig.slug}</span>
              </div>
              <div className="border-b-2 border-zinc-200 pb-4">
                <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">Text Domain</span>
                <span className="text-sm font-black text-zinc-900">{wpConfig.textDomain}</span>
              </div>
              <div>
                <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-1">PHP Engine Target</span>
                <span className="text-sm font-black text-zinc-900">PHP 7.4+ // WP 6.0+</span>
              </div>
            </div>

            <div className="mt-8 border-t-2 border-zinc-950 pt-4 text-[10px] text-zinc-500 font-bold uppercase">
              ⚡ Generated via @forgewp/compiler
            </div>
          </div>
        </section>

        {/* Dynamic Tokens Section */}
        <section id="tokens" className="p-8 md:p-12">
          <div className="border-2 border-zinc-950 p-6 md:p-8 bg-zinc-50">
            <div className="flex items-center gap-3 border-b-2 border-zinc-950 pb-4 mb-8">
              <div className="w-4 h-4 bg-secondary"></div>
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-zinc-950">
                Design Tokens Synchronization Check
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Color Presets */}
              <div className="border border-zinc-300 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-serif font-black text-lg text-zinc-900 mb-4 border-b border-zinc-200 pb-2 uppercase tracking-wide">
                  Color Palette
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {colors.map((c) => (
                    <div key={c.slug} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 border border-zinc-950"
                        style={{ backgroundColor: c.color }}
                      ></div>
                      <div className="flex-1">
                        <span className="block font-black text-zinc-800">{c.name}</span>
                        <span className="text-zinc-500">{c.color} // {c.slug}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography Presets */}
              <div className="border border-zinc-300 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-serif font-black text-lg text-zinc-900 mb-4 border-b border-zinc-200 pb-2 uppercase tracking-wide">
                  Font Families
                </h3>
                <div className="space-y-4">
                  {fontFamilies.map((f) => (
                    <div key={f.slug} className="font-mono text-xs">
                      <span className="block font-black text-zinc-800 uppercase">{f.name}</span>
                      <span className="text-zinc-500 block mb-2">{f.fontFamily}</span>
                      <span
                        className="text-lg block font-semibold text-zinc-950 border border-zinc-200 p-2 bg-zinc-50"
                        style={{ fontFamily: f.fontFamily }}
                      >
                        The quick brown fox
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout Presets */}
              <div className="border border-zinc-300 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900 mb-4 border-b border-zinc-200 pb-2 uppercase tracking-wide">
                    Layout Bounds
                  </h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <span className="block font-black text-zinc-800">CONTENT SIZE</span>
                      <span className="text-zinc-500 text-lg font-black">{layout.contentSize || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block font-black text-zinc-800">WIDE SIZE</span>
                      <span className="text-zinc-500 text-lg font-black">{layout.wideSize || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-zinc-200 pt-4">
                  <span className="block font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Synced Google Fonts
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {googleFonts.map((font) => (
                      <span
                        key={font}
                        className="inline-block bg-zinc-900 text-white text-[10px] font-mono px-2 py-1 uppercase"
                      >
                        {font.split(":")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WordPress Dynamic Data Layer Console Section */}
        <section id="data-layer" className="p-8 md:p-12 border-t-4 border-zinc-950 bg-zinc-50">
          <div className="border-2 border-zinc-950 p-6 md:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 border-b-2 border-zinc-950 pb-4 mb-8">
              <div className="w-4 h-4 bg-brand"></div>
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-zinc-950">
                WordPress Data Layer & Compiler Sandbox
              </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Dynamic Menus Console */}
              <div className="border border-zinc-200 bg-zinc-50 p-6">
                <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                  Hook: &lt;WpMenu&gt;
                </span>
                <h3 className="font-serif font-black text-base text-zinc-900 mb-2">
                  Navigation Menu
                </h3>
                <p className="text-zinc-500 text-xs mb-4">
                  Compiles into dynamic WP site menus (`wp_nav_menu`) managed in the WP Dashboard.
                </p>
                <div className="border border-zinc-300 p-4 bg-white">
                  <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Rendered Header Navigation:
                  </span>
                  <WpMenu
                    location="primary"
                    className="flex flex-col gap-2"
                    linkClassName="font-mono text-xs font-bold uppercase tracking-wide text-zinc-700 hover:text-brand transition-colors"
                  />
                </div>
              </div>

              {/* Custom Meta Fields */}
              <div className="border border-zinc-200 bg-zinc-50 p-6">
                <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                  Hook: useWpCustomField()
                </span>
                <h3 className="font-serif font-black text-base text-zinc-900 mb-2">
                  Metadata & Custom Fields
                </h3>
                <p className="text-zinc-500 text-xs mb-4">
                  Bridges WordPress metadata and ACF (Advanced Custom Fields) directly to your React markup.
                </p>
                <div className="border border-zinc-300 p-4 bg-white font-mono text-xs">
                  <div className="mb-3">
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Field: "author_bio"</span>
                    <span className="text-zinc-800 font-bold">{useWpCustomField("author_bio", "React Developer & WP theme engineer")}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Field: "article_rating"</span>
                    <span className="text-zinc-800 font-bold">{useWpCustomField("article_rating", "⭐️⭐️⭐️⭐️⭐️")}</span>
                  </div>
                </div>
              </div>

              {/* Custom Query Loop */}
              <div className="border border-zinc-200 bg-zinc-50 p-6">
                <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                  Hook: &lt;WpQueryLoop&gt;
                </span>
                <h3 className="font-serif font-black text-base text-zinc-900 mb-2">
                  Custom WP_Query Loop
                </h3>
                <p className="text-zinc-500 text-xs mb-4">
                  Fetches specialized collections of posts (like category grids or sidebars).
                </p>
                <div className="border border-zinc-300 p-3 bg-white space-y-2.5 max-h-[140px] overflow-y-auto">
                  <WpQueryLoop postType="post" postsPerPage={3}>
                    <div className="border border-zinc-100 p-2 hover:bg-zinc-50 transition-colors">
                      <h4 className="font-mono text-xs font-black text-zinc-950 uppercase tracking-tight truncate">
                        ⚡ Recent Block Post
                      </h4>
                      <span className="text-[9px] text-zinc-400 font-mono">Date: {new Date().toLocaleDateString()}</span>
                    </div>
                  </WpQueryLoop>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer info console bar */}
        <footer className="border-t-4 border-zinc-950 bg-zinc-950 text-white p-6 font-mono text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-green-500 animate-pulse"></span>
            <span>Vite Dev Environment active on port 5173</span>
          </div>
          <div>
            <span>Press <kbd className="bg-zinc-800 px-1 py-0.5 border border-zinc-700">Ctrl + C</kbd> to exit console</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
