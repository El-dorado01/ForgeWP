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
    <section className="bg-zinc-50 py-24 px-6 md:px-12 border-b-4 border-zinc-950 selection:bg-brand selection:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black font-serif tracking-tight text-zinc-950 mb-4 leading-none">
            Transparent Pricing Tiers
          </h2>
          <p className="text-zinc-600 max-w-xl mx-auto text-sm font-mono uppercase tracking-wider font-bold">
            Choose the perfect tier to match your development and deployment scale.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`bg-white border-4 border-zinc-950 p-8 flex flex-col justify-between rounded-none transition-all ${
                tier.popular ? "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-105" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono font-black text-sm uppercase tracking-wider text-zinc-950">{tier.name}</span>
                  {tier.popular && (
                    <span className="bg-brand text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest font-black border-2 border-zinc-950">
                      Popular
                    </span>
                  )}
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-serif font-black text-zinc-950">{tier.price}</span>
                  <span className="text-zinc-500 font-mono text-xs font-bold">/mo</span>
                </div>
                
                <p className="text-zinc-600 text-xs mb-6 leading-relaxed font-semibold">{tier.desc}</p>
                
                <ul className="space-y-3 mb-8 text-xs font-bold text-zinc-700">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-zinc-950 font-black">⚡</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className={`w-full text-center border-2 border-zinc-950 py-3 font-mono text-xs font-black uppercase tracking-wider transition-all rounded-none ${
                tier.popular ? "bg-zinc-950 text-white hover:bg-white hover:text-zinc-950" : "bg-white text-zinc-950 hover:bg-zinc-100"
              }`}>
                Select {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
