import { SEO } from "../.forgewp/SEO";
import { Navbar } from "@/components/ui/navbar";
import { HeroSection } from "@/components/ui/hero-section";
import { PricingTable } from "@/components/ui/pricing-table";
import { WpQueryLoop, useWpTitle, useWpCustomField, useWpPermalink } from "../.forgewp/wordpress";
import TestimonialBlock from "@/blocks/TestimonialBlock";

function ServiceCard() {
  return (
    <div className="bg-white border-4 border-zinc-950 p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 transition-transform duration-300">
      <div className="text-4xl mb-6">{useWpCustomField("icon", "⚡")}</div>
      <h3 className="text-xl font-black text-zinc-950 uppercase tracking-wide mb-3">
        {useWpTitle()}
      </h3>
      <p className="text-zinc-600 font-semibold mb-6">
        {useWpCustomField("short_desc", "High-performance digital scaling and execution.")}
      </p>
      <a 
        href={useWpPermalink()} 
        className="inline-flex border-b-2 border-brand text-zinc-950 font-black uppercase tracking-wider text-xs pb-1 hover:text-brand transition-colors"
      >
        Explore Capability →
      </a>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-light">
      <SEO title="Forge Digital — Modern Business Agency" description="Scaling enterprise applications with unmatched speed and brutalist precision." />

      {/* Registry Component: Navigation */}
      <Navbar />

      {/* Registry Component: Hero Banner */}
      <HeroSection />

      {/* Custom Dynamic Section: Services Grid powered by local JSON DB */}
      <section className="py-24 px-6 md:px-12 bg-zinc-950 text-white selection:bg-brand selection:text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-brand text-white text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 mb-4 select-none">
              Capabilities
            </span>
            <h2 className="text-3xl md:text-5xl font-black font-serif tracking-tight mb-4 leading-none">
              Our Core Services
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-sm font-mono uppercase tracking-wider font-bold">
              We leverage cutting-edge tools to deliver absolute performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <WpQueryLoop postType="service" postsPerPage={6}>
              <ServiceCard />
            </WpQueryLoop>
          </div>
        </div>
      </section>

      {/* Dynamic Gutenberg Block Preview */}
      <section className="py-24 px-6 md:px-12 bg-zinc-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-950">
              Client Feedback
            </h2>
          </div>
          <TestimonialBlock 
            author="Sarah Jenkins" 
            quote="ForgeWP completely revolutionized how we build WordPress themes. The transition from React to PHP is completely seamless and the resulting performance is absolutely unmatched." 
            company="TechNova Solutions" 
          />
        </div>
      </section>

      {/* Registry Component: Pricing */}
      <PricingTable />

      {/* Global Footer */}
      <footer className="bg-zinc-950 border-t-4 border-zinc-800 py-12 px-6 text-center text-zinc-500 font-mono text-xs uppercase tracking-wider font-bold">
        <p>© 2026 Forge Digital Agency. All rights reserved.</p>
      </footer>
    </div>
  );
}
