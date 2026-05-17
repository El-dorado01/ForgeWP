/**
 * ForgeWP Component Registry — Phase 3 Component System
 * 
 * High-fidelity, dynamic design-aesthetic-aware React components.
 * These components read '--radius', '--border-width', '--border-color', and '--shadow-offset'
 * from CSS variables, so they automatically morph perfectly to match both 'forgewp' (sharp neo-brutalist)
 * and 'shadcn' (smooth modern curved) layout designs!
 */

export const COMPONENT_REGISTRY = {
  "navbar": {
    filename: "Navbar.tsx",
    code: `import React from "react";
import { useWpTitle } from "../lib/wordpress";

export function Navbar() {
  const siteTitle = useWpTitle();
  
  return (
    <header className="w-full bg-white border-b-[length:var(--border-width)] border-[color:var(--border-color)] py-4 px-6 md:px-12 flex items-center justify-between selection:bg-brand selection:text-white">
      <div className="flex items-center gap-3 font-mono font-black uppercase text-lg tracking-wider text-zinc-950 select-none">
        <span>⚡ {siteTitle}</span>
      </div>
      
      <nav className="hidden md:flex items-center gap-6 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600">
        <a href="#" className="hover:text-zinc-950 transition-colors">Home</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">About</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">Services</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">Contact</a>
      </nav>
      
      <button className="border-[length:var(--border-width)] border-[color:var(--border-color)] bg-zinc-950 text-white font-mono text-xs font-black uppercase tracking-widest px-4 py-2 hover:bg-white hover:text-zinc-950 transition-all shadow-[var(--shadow-offset)_var(--shadow-offset)_0px_0px_rgba(0,0,0,1)] rounded-[var(--radius)]">
        Launch App
      </button>
    </header>
  );
}
`
  },
  
  "hero-section": {
    filename: "HeroSection.tsx",
    code: `import React from "react";

export function HeroSection() {
  return (
    <section className="relative bg-white py-20 px-6 md:px-12 border-b-[length:var(--border-width)] border-[color:var(--border-color)] selection:bg-brand selection:text-white">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block bg-zinc-950 text-white text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 mb-6 rounded-[var(--radius)] select-none">
          Active Framework Preview
        </span>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-950 mb-6 font-serif leading-none">
          High-Performance WordPress Themes. <br className="hidden md:block"/>Designed in React.
        </h1>
        
        <p className="text-base md:text-lg text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed font-sans font-medium">
          Build responsive, gorgeous, production-ready block themes using full source code access, hot reload previews, and custom design tokens.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <button className="border-[length:var(--border-width)] border-[color:var(--border-color)] bg-zinc-950 text-white font-mono text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-zinc-950 transition-all shadow-[var(--shadow-offset)_var(--shadow-offset)_0px_0px_rgba(0,0,0,1)] rounded-[var(--radius)]">
            Get Started
          </button>
          
          <button className="border-[length:var(--border-width)] border-[color:var(--border-color)] bg-white text-zinc-950 font-mono text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-zinc-100 transition-all rounded-[var(--radius)]">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
`
  },
  
  "pricing-table": {
    filename: "PricingTable.tsx",
    code: `import React from "react";

export function PricingTable() {
  const tiers = [
    { 
      name: "Starter", 
      price: "$0", 
      desc: "For hobbyists and individual developers.", 
      features: ["1 Active Theme", "Tailwind Integration", "Standard Support"] 
    },
    { 
      name: "Pro", 
      price: "$49", 
      desc: "For professional digital design agencies.", 
      features: ["Unlimited Themes", "Full Gutenberg Integration", "Priority Support", "Advanced Custom Fields"], 
      popular: true 
    },
    { 
      name: "Enterprise", 
      price: "$199", 
      desc: "For large enterprise digital scaling.", 
      features: ["Everything in Pro", "Dedicated Account Lead", "Custom AST Compilers", "SLA Support"] 
    }
  ];

  return (
    <section className="bg-zinc-50 py-20 px-6 md:px-12 border-b-[length:var(--border-width)] border-[color:var(--border-color)] selection:bg-brand selection:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black font-serif tracking-tight text-zinc-950 mb-4 leading-none">
            Transparent Pricing Tiers
          </h2>
          <p className="text-zinc-600 max-w-xl mx-auto text-sm font-medium">
            Choose the perfect tier to match your development and deployment scale.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={\`bg-white border-[length:var(--border-width)] border-[color:var(--border-color)] p-8 flex flex-col justify-between rounded-[var(--radius)] transition-all \${
                tier.popular ? "shadow-[var(--shadow-offset)_var(--shadow-offset)_0px_0px_rgba(0,0,0,1)] scale-105" : ""
              }\`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono font-black text-sm uppercase tracking-wider text-zinc-950">{tier.name}</span>
                  {tier.popular && (
                    <span className="bg-zinc-950 text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest font-black">
                      Popular
                    </span>
                  )}
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-serif font-black text-zinc-950">{tier.price}</span>
                  <span className="text-zinc-500 font-mono text-xs font-bold">/mo</span>
                </div>
                
                <p className="text-zinc-600 text-xs mb-6 leading-relaxed font-medium">{tier.desc}</p>
                
                <ul className="space-y-3 mb-8 text-xs font-semibold text-zinc-700">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-brand font-black">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className={\`w-full text-center border-[length:var(--border-width)] border-[color:var(--border-color)] py-3 font-mono text-xs font-black uppercase tracking-wider transition-all rounded-[var(--radius)] \${
                tier.popular ? "bg-zinc-950 text-white hover:bg-white hover:text-zinc-950" : "bg-white text-zinc-950 hover:bg-zinc-100"
              }\`}>
                Select {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`
  }
};
