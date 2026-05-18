export function HeroSection() {
  return (
    <section className="relative bg-white py-24 px-6 md:px-12 border-b-4 border-zinc-950 selection:bg-brand selection:text-white">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block bg-zinc-950 text-white text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 mb-6 rounded-none select-none">
          Active Framework Preview
        </span>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-950 mb-6 font-serif leading-none">
          High-Performance WordPress Themes. <br className="hidden md:block"/>Designed in React.
        </h1>
        
        <p className="text-base md:text-lg text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed font-sans font-medium">
          Build responsive, gorgeous, production-ready block themes using full source code access, hot reload previews, and custom design tokens.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <button className="border-2 border-zinc-950 bg-zinc-950 text-white font-mono text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-zinc-950 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
            Get Started
          </button>
          
          <button className="border-2 border-zinc-950 bg-white text-zinc-950 font-mono text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-zinc-100 transition-all rounded-none">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
