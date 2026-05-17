export default function HeroBlock({ title, subtitle, buttonText }: { title: string; subtitle: string; buttonText: string }) {
  return (
    <div className="p-12 bg-zinc-950 text-white border-4 border-zinc-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none my-8">
      <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-4">
        Dynamic Gutenberg Block
      </span>
      <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-none text-white">
        {title}
      </h2>
      <p className="mt-4 text-sm text-zinc-400 font-sans leading-relaxed max-w-xl">
        {subtitle}
      </p>
      <div className="mt-6">
        <button className="border-2 border-white bg-white text-zinc-950 font-mono text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-zinc-950 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rounded-none">
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export const settings = {
  title: "Sharp Brutalist Hero",
  icon: "megaphone",
  category: "design",
  attributes: {
    title: { type: "string", default: "Customize This Block in Gutenberg!" },
    subtitle: { type: "string", default: "This is a dynamic block authored in React and compiled automatically to native PHP render blocks by the ForgeWP Theme Compiler." },
    buttonText: { type: "string", default: "Get Started Now" }
  }
};
