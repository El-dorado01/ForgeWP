import wpConfig from "../../wp.config";
import {
  useWpCustomField,
  WpMenu,
  WpQueryLoop,
  WpHead,
  WpImage,
  WpShortcode,
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpPermalink,
  useWpDate,
  useWpAuthor,
  useWpFeaturedImage,
  useWpOption,
  useWpThemeMod,
  useWpCategories,
  useWpArchiveTitle,
} from "../.forgewp/wordpress";
import { Hydrate, useReducedMotion, getStaticMotionStyle } from "@forgewp/react";
import { Counter } from "../components/Counter";
import { QuerySandbox } from "../components/QuerySandbox";

export default function HomePage() {
  const colors = wpConfig.settings?.color?.palette || [];
  const fontFamilies = wpConfig.settings?.typography?.fontFamilies || [];
  const googleFonts = wpConfig.settings?.typography?.googleFonts || [];
  const layout = wpConfig.settings?.layout || {};

  return (
    <div className="min-h-screen bg-bg-light p-6 md:p-12 font-sans selection:bg-brand selection:text-white">
      <WpHead title="ForgeWP Starter Theme" description="A highly optimized Selective Hydration WordPress theme built with React." />

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

            <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-4">
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
                <div className="border border-zinc-300 p-4 bg-white font-mono text-xs space-y-3">
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Field: "author_bio"</span>
                    <span className="text-zinc-800 font-bold">{useWpCustomField("author_bio", "React Developer & WP theme engineer")}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Field: "media_lookup"</span>
                    <WpImage field="media_lookup" size="medium" className="w-full h-20 object-cover border border-zinc-950 mt-1" />
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
                  Fetches collections of posts and resolves featured media objects.
                </p>
                <div className="border border-zinc-300 p-3 bg-white space-y-2.5 max-h-[160px] overflow-y-auto">
                  <WpQueryLoop postType="post" postsPerPage={3}>
                    <div className="border border-zinc-100 p-2 hover:bg-zinc-50 transition-colors flex items-center gap-2.5">
                      <WpImage field="featuredImage" size="thumbnail" className="w-8 h-8 object-cover border border-zinc-950 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-mono text-[10px] font-black text-zinc-950 uppercase tracking-tight truncate">
                          ⚡ Recent Block Post
                        </h4>
                        <span className="text-[9px] text-zinc-400 font-mono">Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </WpQueryLoop>
                </div>
              </div>

              {/* Interactive Selective Hydration Island */}
              <div className="border border-zinc-200 bg-zinc-50 p-6 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                    Component: &lt;Hydrate&gt;
                  </span>
                  <h3 className="font-serif font-black text-base text-zinc-900 mb-2">
                    Selective Hydration
                  </h3>
                  <p className="text-zinc-500 text-xs mb-4">
                    Splits React code into dynamic chunks loaded lazily with advanced triggers.
                  </p>
                </div>
                <Hydrate trigger="visible" preload="near-visible">
                  <Counter />
                </Hydrate>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 2: State Hooks & Isomorphic Hydration Engine Simulator */}
        <section className="p-8 md:p-12 border-t-4 border-zinc-950 bg-zinc-100">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 border-b-2 border-zinc-950 pb-4 mb-8">
              <div className="w-4 h-4 bg-accent"></div>
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-zinc-950">
                Phase 2: Isomorphic Hydration & State Hooks Sandbox
              </h2>
            </div>
            <p className="text-sm font-medium text-zinc-700 leading-relaxed mb-6 font-sans">
              This interactive widget demonstrates Tier 2 stateful orchestration. In local dev, it loads mock data offline from <code>cms/mock-data.json</code> and mock settings from <code>cms/site-settings.json</code>. When exported, the compiler converts options to PHP calls and packages the search engine as a hydrated interactive selective component fetching from the real WordPress REST API.
            </p>
            <Hydrate trigger="visible" preload="near-visible">
              <QuerySandbox />
            </Hydrate>
          </div>
        </section>

        {/* Phase 3: Deep Engine Integration Showcase (Advanced Hooks & Core APIs) */}
        <section className="p-8 md:p-12 border-t-4 border-zinc-950 bg-zinc-50">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 border-b-2 border-zinc-950 pb-4 mb-8">
              <div className="w-4 h-4 bg-brand"></div>
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-zinc-950">
                Phase 3: Deep Engine Integration Showcase (Advanced Hooks & Core APIs)
              </h2>
            </div>
            <p className="text-sm font-medium text-zinc-700 leading-relaxed mb-8 font-sans">
              This terminal showcases Tier 3 advanced framework capabilities. Below, you can test WordPress shortcode compiler transformations, meta custom field lookups, multi-trigger selective hydration islands, and our hardware-adaptive animation framework.
            </p>

            <div className="grid gap-8 md:grid-cols-2 mb-8">
              {/* Shortcode Compilation Sandbox */}
              <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                    Feature: Shortcode Compiler
                  </span>
                  <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                    WordPress Shortcodes
                  </h3>
                  <p className="text-zinc-500 text-xs mb-4">
                    Compiles directly into dynamic native PHP <code>do_shortcode()</code> execution.
                  </p>
                </div>
                <div className="border border-zinc-200 p-2 bg-zinc-50 rounded">
                  <WpShortcode code="[gallery size='medium' columns='3' ids='42,50,51']" />
                </div>
              </div>

              {/* Dynamic Image & ACF Media Lookup */}
              <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                    Feature: Responsive Media
                  </span>
                  <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                    WpImage Media Attachments
                  </h3>
                  <p className="text-zinc-500 text-xs mb-4">
                    Resolves WordPress media library attachments responsive <code>srcset</code> arrays.
                  </p>
                </div>
                <div className="border border-zinc-200 p-4 bg-zinc-50 font-mono text-xs">
                  <span className="block text-[9px] text-zinc-400 font-bold uppercase mb-1">
                    Image Hook (ID: 42):
                  </span>
                  <WpImage id={42} size="medium" className="w-full h-24 object-cover border-2 border-zinc-950" />
                </div>
              </div>
            </div>

            {/* Hydration Triggers Island Suite */}
            <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
              <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                Feature: Selective Hydration Triggers
              </span>
              <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                Hydration Triggers Suite
              </h3>
              <p className="text-zinc-500 text-xs mb-6">
                Test multi-trigger lazy bundles. Compare how mouse interactions, scrolls, and actions hydrate islands instantly.
              </p>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Hover trigger card */}
                <div className="border-2 border-dashed border-zinc-300 p-4 hover:border-zinc-950 transition-colors">
                  <span className="block text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400 mb-2">
                    Trigger: "hover" (Hover card to activate)
                  </span>
                  <Hydrate trigger="hover">
                    <Counter label="Hover Hydrated Counter" />
                  </Hydrate>
                </div>

                {/* Click trigger card */}
                <div className="border-2 border-dashed border-zinc-300 p-4 hover:border-zinc-950 transition-colors">
                  <span className="block text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400 mb-2">
                    Trigger: "click" (Click card to activate)
                  </span>
                  <Hydrate trigger="click">
                    <Counter label="Click Hydrated Counter" />
                  </Hydrate>
                </div>
              </div>
            </div>

            {/* Hardware-Adaptive Accessibility & CLS Engine */}
            <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                Feature: Hardware-Adaptive Motion Engine
              </span>
              <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                Zero-CLS Accessibility & Animation
              </h3>
              <p className="text-zinc-500 text-xs mb-4">
                Reads system-level reduced motion settings (<code>prefers-reduced-motion</code>) to disable expensive layouts, while using static styles to eliminate cumulative layout shifts.
              </p>
              
              <MotionShowcase />
            </div>
          </div>
        </section>

        {/* Phase 4: Unified Isomorphic State & Loop Showcase (Full Core API Coverage) */}
        <section className="p-8 md:p-12 border-t-4 border-zinc-950 bg-zinc-50">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 border-b-2 border-zinc-950 pb-4 mb-8">
              <div className="w-4 h-4 bg-brand"></div>
              <h2 className="text-lg md:text-xl font-bold uppercase tracking-wider text-zinc-950">
                Phase 4: Unified Isomorphic State & Loop Showcase
              </h2>
            </div>
            
            <p className="text-sm font-medium text-zinc-700 leading-relaxed mb-8 font-sans">
              This panel showcases the complete WordPress state hooks, isomorphic loops, option lookups, and theme customizer mod variables. In offline React dev, they instantly pull from standard mock schemas. When compiled, the compiler transforms them into raw dynamic theme hooks.
            </p>

            <div className="grid gap-8 md:grid-cols-2 mb-8">
              {/* Options & Theme Mods Control Panel */}
              <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                  Feature: Options & Theme Customizer
                </span>
                <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                  Site Options & Mods Registry
                </h3>
                <p className="text-zinc-500 text-xs mb-4">
                  Read standard dynamic site configuration, identity modifications, custom options and settings dynamically.
                </p>

                <div className="border-2 border-zinc-950 p-4 bg-zinc-50 font-mono text-xs space-y-4">
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Blog Name (Option: "blogname")</span>
                    <span className="text-sm font-black text-zinc-900">{useWpOption("blogname", "ForgeWP Dev Server")}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Blog Tagline (Option: "blogdescription")</span>
                    <span className="text-zinc-700 font-medium">{useWpOption("blogdescription", "Offline mock environment")}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Footer Credits (Theme Mod: "footer_text")</span>
                    <span className="text-zinc-700 font-medium">{useWpThemeMod("footer_text", "Theme mods offline fallback.")}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Theme Accent Color (Theme Mod: "accent_color")</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="w-4 h-4 border border-zinc-950 inline-block" 
                        style={{ backgroundColor: useWpThemeMod("accent_color", "#ff6b6b") }}
                      ></span>
                      <span className="font-bold text-zinc-900">{useWpThemeMod("accent_color", "#ff6b6b")}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Archive Context Header (Archive Title)</span>
                    <span className="text-sm font-black text-zinc-900 italic">"{useWpArchiveTitle()}"</span>
                  </div>
                </div>
              </div>

              {/* Multi-Location Menus Sandbox */}
              <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                    Feature: Menus Pipeline
                  </span>
                  <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                    Multi-Location WordPress Menus
                  </h3>
                  <p className="text-zinc-500 text-xs mb-4">
                    Render dynamic navigation setups by binding diverse registered locations.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="border border-zinc-300 p-3 bg-zinc-50">
                      <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-2">
                        Location: "primary" (Header Menu)
                      </span>
                      <WpMenu
                        location="primary"
                        className="flex flex-wrap gap-x-4 gap-y-1"
                        linkClassName="font-mono text-xs font-bold uppercase tracking-wide text-zinc-700 hover:text-brand transition-colors"
                      />
                    </div>

                    <div className="border border-zinc-300 p-3 bg-zinc-50">
                      <span className="block font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-2">
                        Location: "utility" (Utility Menu)
                      </span>
                      <WpMenu
                        location="utility"
                        className="flex flex-wrap gap-x-4 gap-y-1"
                        linkClassName="font-mono text-xs font-bold uppercase tracking-wide text-zinc-700 hover:text-brand transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Standalone Isomorphic Loop Component Bridge */}
            <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="inline-block bg-zinc-950 text-white text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 mb-4">
                Component: &lt;WpLoop&gt; & State Hooks Loop Context
              </span>
              <h3 className="font-serif font-black text-base text-zinc-900 mb-2 uppercase">
                Standard WordPress Main Loop Abstraction
              </h3>
              <p className="text-zinc-500 text-xs mb-6">
                Iterating over the standard WP main query database via <code>&lt;WpLoop&gt;</code>. Inside, hooks like <code>useWpTitle()</code>, <code>useWpAuthor()</code>, <code>useWpCategories()</code>, and <code>useWpExcerpt()</code> dynamically lock onto the current item context.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <WpQueryLoop postType="post" postsPerPage={6}>
                  <PostCard />
                </WpQueryLoop>
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

function MotionShowcase() {
  const isReduced = useReducedMotion();

  // SSR Initial static styles to guarantee zero FOUC/CLS
  const initialStyles = getStaticMotionStyle({ opacity: 0.1, scale: 0.95 });

  return (
    <div className="border border-zinc-200 p-6 bg-zinc-50 font-mono text-xs flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex-1">
        <span className="block text-[9px] text-zinc-400 font-bold uppercase mb-1">
          Accessibility Status:
        </span>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isReduced ? "bg-amber-500" : "bg-green-500 animate-pulse"}`}></span>
          <span className="font-bold text-zinc-900">
            {isReduced ? "Reduced Motion Enabled (Animations Safe/Disabled)" : "Full Motion Active (Fluid Micro-Animations)"}
          </span>
        </div>
      </div>
      <div 
        style={isReduced ? {} : initialStyles}
        className={`w-full md:w-48 border-2 border-zinc-950 p-3 text-center font-bold text-white uppercase select-none transition-all duration-700 bg-brand ${
          isReduced 
            ? "translate-y-0 opacity-100 scale-100" 
            : "hover:scale-105 hover:bg-zinc-950 hover:shadow-[4px_4px_0px_0px_rgba(255,107,107,1)]"
        }`}
      >
        ✨ Isomorphic Card ✨
      </div>
    </div>
  );
}

function PostCard() {
  const title = useWpTitle();
  const content = useWpContent();
  const excerpt = useWpExcerpt();
  const permalink = useWpPermalink();
  const date = useWpDate();
  const author = useWpAuthor();
  const featuredImage = useWpFeaturedImage();
  const categories = useWpCategories();

  return (
    <div className="border-4 border-zinc-950 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] font-mono font-bold text-zinc-500 uppercase border-b border-zinc-200 pb-2">
          <span>By {author}</span>
          <span>{date}</span>
        </div>
        
        {featuredImage && (
          <img 
            src={featuredImage} 
            alt={title}
            className="w-full h-40 object-cover border-2 border-zinc-950" 
          />
        )}
        
        <div>
          <h4 className="font-serif font-black text-xl text-zinc-950 uppercase hover:text-brand">
            <a href={permalink}>{title}</a>
          </h4>
          <div className="mt-1 flex items-center gap-1 font-mono text-[9px] font-black text-zinc-400 uppercase">
            <span>In: </span>
            <span dangerouslySetInnerHTML={{ __html: categories }} />
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed font-sans font-medium">
          {excerpt}
        </p>

        <div className="border border-zinc-200 bg-zinc-50 p-3 mt-2 rounded">
          <span className="block text-[8px] font-mono text-zinc-400 uppercase tracking-widest mb-1">
            Raw PHP Content Bridge (Compiled &lt;?php the_content() ?&gt;)
          </span>
          <div 
            className="text-[11px] text-zinc-500 font-mono line-clamp-3 leading-snug"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
