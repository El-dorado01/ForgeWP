import { useWpTitle } from "@/.forgewp/wordpress";

export function Navbar() {
  const siteTitle = useWpTitle();
  
  return (
    <header className="w-full bg-white border-b-4 border-zinc-950 py-4 px-6 md:px-12 flex items-center justify-between selection:bg-brand selection:text-white">
      <div className="flex items-center gap-3 font-mono font-black uppercase text-lg tracking-wider text-zinc-950 select-none">
        <span>⚡ {siteTitle}</span>
      </div>
      
      <nav className="hidden md:flex items-center gap-6 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600">
        <a href="#" className="hover:text-zinc-950 transition-colors">Home</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">About</a>
        <a href="/services" className="hover:text-zinc-950 transition-colors">Services</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">Contact</a>
      </nav>
      
      <button className="border-2 border-zinc-950 bg-zinc-950 text-white font-mono text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-white hover:text-zinc-950 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none">
        Launch App
      </button>
    </header>
  );
}
