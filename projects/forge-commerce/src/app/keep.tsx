import { WpHead, WpImage } from "@forgewp/react";
import { BookOpen, Github, ChevronRight, Layers, Cpu, ShoppingBag } from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full bg-[#fafafa]">
      
      {/* ── HERO SECTION (Screen Height Viewport) ── */}
      <div className="relative h-screen w-full flex flex-col justify-between overflow-hidden text-slate-900 font-sans select-none bg-[#fafafa]">
        <WpHead
          title="Forge Commerce — Headless React Shop Theme"
          description="Headless e-commerce development with native WordPress block theme output."
          ogType="website"
        />

        {/* ── BACKGROUND: AI Image Asset showing actual width ── */}
        <div className="absolute inset-y-0 right-0 w-full h-full z-0 overflow-hidden flex justify-end items-end">
          <WpImage
            src="/bg-image.png"
            alt="Background fashion model"
            className="h-full w-auto object-contain object-bottom will-change-transform transform-gpu"
          />
        </div>

        {/* Spacer to push content down since header was removed */}
        <div className="h-16 shrink-0 z-20"></div>

        {/* ── HERO CONTENT: Left aligned overlay ── */}
        <main className="relative w-full max-w-7xl mx-auto flex-1 flex items-center z-20 px-6 md:px-12 py-12 lg:py-0">
          <div className="max-w-[45%] text-left hidden lg:block">
            {/* Tagline Badge */}
            <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38E7A] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              WooCommerce React Engine
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black tracking-tight leading-[1.05] uppercase text-slate-900 mb-6">
              Pure React structure.
              <br />
              Tailwind speed.
              <br />
              <span className="bg-linear-to-r from-primary to-amber-500 bg-clip-text text-transparent">WordPress power.</span>
            </h2>

            <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal max-w-xl mb-8 font-sans">
              Scaffold interactive WordPress webshops with the speed of React. ForgeWP transpiles your isomorphic components directly into production-grade block themes, giving you a headless design experience with native PHP output.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="/query-sandbox"
                className="group relative inline-flex items-center justify-center bg-transparent text-primary hover:text-[#8E7A68] border border-primary font-mono font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors duration-500 rounded-none overflow-hidden select-none cursor-pointer shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/15"
              >
                <div className="absolute inset-y-0 left-0 bg-primary w-0 group-hover:w-full transition-all duration-500 ease-out z-0"></div>
                <span className="relative z-10 flex items-center justify-center group-hover:text-white transition-colors duration-500">
                  Explore Query Sandbox
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>

              <a
                href="/wp-editable"
                className="group inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 font-mono font-bold text-xs uppercase tracking-widest px-8 py-4 shadow-md transition-all duration-200 rounded-none select-none cursor-pointer"
              >
                Block Canvas Preview
              </a>
            </div>
          </div>

          {/* Mobile Layout (Full width container overlaying image) */}
          <div className="w-full text-left lg:hidden">
            {/* Tagline Badge */}
            <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38E7A] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              WooCommerce React Engine
            </span>

            <h2 className="text-4xl font-heading font-black tracking-tight leading-[1.05] uppercase text-slate-900 mb-6">
              Pure React structure.
              <br />
              Tailwind speed.
              <br />
              <span className="bg-linear-to-r from-primary to-amber-500 bg-clip-text text-transparent">WordPress power.</span>
            </h2>

            <p className="text-slate-600 text-xs leading-relaxed font-normal max-w-xl mb-8 font-sans">
              Scaffold interactive WordPress webshops with the speed of React. ForgeWP transpiles your isomorphic components directly into production-grade block themes, giving you a headless design experience with native PHP output.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="/query-sandbox"
                className="group relative inline-flex items-center justify-center bg-transparent text-primary hover:text-[#8E7A68] border border-primary font-mono font-bold text-xs uppercase tracking-widest px-6 py-3.5 transition-colors duration-500 rounded-none overflow-hidden select-none cursor-pointer shadow-lg shadow-primary/5"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Explore Query Sandbox
                  <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              </a>

              <a
                href="/wp-editable"
                className="group inline-flex items-center justify-center bg-slate-100 text-slate-800 border border-slate-200/80 font-mono font-bold text-xs uppercase tracking-widest px-6 py-3.5 shadow-md rounded-none"
              >
                Block Canvas Preview
              </a>
            </div>
          </div>
        </main>

        {/* ── FOOTER: Sleek credits and repository links ── */}
        <footer className="relative w-full max-w-7xl mx-auto py-8 px-6 md:px-12 z-20 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 font-mono text-[10px] uppercase tracking-widest shrink-0">
          <div>
            © {new Date().getFullYear()} FORGE COMMERCE. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-6">
            <a href="https://github.com/forgewp/forgewp" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" />
              GITHUB
            </a>
            <a href="https://forgewp.dev/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              DOCUMENTATION
            </a>
          </div>
        </footer>
      </div>

      {/* ── ADDITIONAL SECTIONS FOR SCROLL TESTING ── */}
      <div className="relative z-30 bg-[#fafafa] border-t border-slate-200">
        {/* Features Section */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38E7A] bg-primary/10 px-3 py-1.5 rounded-full mb-4 inline-block">
              Core Capabilities
            </span>
            <h3 className="text-3xl md:text-4xl font-heading font-black uppercase text-slate-900 tracking-tight">
              Engineered for Modern Headless E-commerce
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200/60 p-8 rounded-none hover:border-primary/50 transition-all duration-300 group">
              <div className="p-3 bg-primary/10 w-fit mb-6 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold uppercase text-lg text-slate-900 mb-3 tracking-wide">React & Next.js DX</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-sans">
                Build your storefront using familiar React patterns, hooks, and component lifecycle events. Enjoy complete architectural freedom.
              </p>
            </div>
            
            <div className="bg-white border border-slate-200/60 p-8 rounded-none hover:border-primary/50 transition-all duration-300 group">
              <div className="p-3 bg-primary/10 w-fit mb-6 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold uppercase text-lg text-slate-900 mb-3 tracking-wide">Zero-Latency Hydration</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-sans">
                ForgeWP transpiles your React hierarchy directly to native WordPress block theme files. Fast loading times and perfect SEO scores.
              </p>
            </div>
            
            <div className="bg-white border border-slate-200/60 p-8 rounded-none hover:border-primary/50 transition-all duration-300 group">
              <div className="p-3 bg-primary/10 w-fit mb-6 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-bold uppercase text-lg text-slate-900 mb-3 tracking-wide">WooCommerce Native API</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-sans">
                First-class integration with WooCommerce. Manage carts, checkouts, and customer sessions natively with our lightweight hooks.
              </p>
            </div>
          </div>
        </section>

        {/* Product Grid Section */}
        <section className="py-24 px-6 md:px-12 bg-slate-50 border-y border-slate-200/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38E7A] bg-primary/10 px-3 py-1.5 rounded-full mb-4 inline-block">
                  Mock Storefront
                </span>
                <h3 className="text-3xl md:text-4xl font-heading font-black uppercase text-slate-900 tracking-tight">
                  Interactive Testing Canvas
                </h3>
              </div>
              <p className="text-slate-500 text-sm font-sans max-w-md mt-4 md:mt-0 leading-relaxed">
                Simulate cart interactions and state synchronization with headless WooCommerce mock data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Product Card 1 */}
              <div className="bg-white border border-slate-200 overflow-hidden group">
                <div className="aspect-4/5 bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase">
                    [Product Image Placeholder]
                  </div>
                  <div className="absolute top-4 left-4 bg-primary text-white font-mono text-[9px] uppercase tracking-wider px-2 py-1">
                    NEW ARRIVAL
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-heading font-bold uppercase text-base text-slate-900 mb-1 tracking-wider">Minimalist Wool Coat</h4>
                  <p className="text-primary font-mono text-sm mb-4 font-bold">$220.00</p>
                  <button className="w-full bg-slate-900 hover:bg-primary text-white font-mono font-bold text-[10px] uppercase tracking-widest py-3.5 transition-colors duration-300">
                    ADD TO CART
                  </button>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="bg-white border border-slate-200 overflow-hidden group">
                <div className="aspect-4/5 bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase">
                    [Product Image Placeholder]
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-heading font-bold uppercase text-base text-slate-900 mb-1 tracking-wider">Structured Wool Blazer</h4>
                  <p className="text-primary font-mono text-sm mb-4 font-bold">$180.00</p>
                  <button className="w-full bg-slate-900 hover:bg-primary text-white font-mono font-bold text-[10px] uppercase tracking-widest py-3.5 transition-colors duration-300">
                    ADD TO CART
                  </button>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="bg-white border border-slate-200 overflow-hidden group">
                <div className="aspect-4/5 bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase">
                    [Product Image Placeholder]
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-heading font-bold uppercase text-base text-slate-900 mb-1 tracking-wider">Classic Ribbed Beanie</h4>
                  <p className="text-primary font-mono text-sm mb-4 font-bold">$45.00</p>
                  <button className="w-full bg-slate-900 hover:bg-primary text-white font-mono font-bold text-[10px] uppercase tracking-widest py-3.5 transition-colors duration-300">
                    ADD TO CART
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A38E7A] bg-primary/10 px-3 py-1.5 rounded-full mb-4 inline-block">
              Compilation Pipeline
            </span>
            <h3 className="text-3xl md:text-4xl font-heading font-black uppercase text-slate-900 tracking-tight mb-4">
              From Isomorphic React to Native PHP
            </h3>
            <p className="text-slate-500 font-sans text-sm max-w-xl mx-auto">
              How ForgeWP transpiles custom components directly into traditional WordPress block theme hierarchies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="relative p-6">
              <div className="font-mono text-5xl font-black text-slate-200 mb-4">01</div>
              <h4 className="font-heading font-bold uppercase text-slate-900 mb-2 tracking-wide">React & Tailwind Code</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-sans max-w-xs mx-auto">
                Author code standardly using modern React patterns, classes, and styles.
              </p>
            </div>
            
            <div className="relative p-6">
              <div className="font-mono text-5xl font-black text-slate-200 mb-4">02</div>
              <h4 className="font-heading font-bold uppercase text-slate-900 mb-2 tracking-wide">AST Parser Compile</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-sans max-w-xs mx-auto">
                ForgeWP compiles components to static block patterns and dynamic PHP templates.
              </p>
            </div>

            <div className="relative p-6">
              <div className="font-mono text-5xl font-black text-slate-200 mb-4">03</div>
              <h4 className="font-heading font-bold uppercase text-slate-900 mb-2 tracking-wide">Native Theme Output</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-sans max-w-xs mx-auto">
                Deploy compiled theme files directly to any standard PHP-based WordPress setup.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
