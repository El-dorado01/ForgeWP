export default function TestimonialBlock({ author, quote, company }: { author: string; quote: string; company: string }) {
  return (
    <figure className="max-w-3xl mx-auto my-16 p-8 md:p-12 bg-zinc-950 border-4 border-zinc-950 shadow-[12px_12px_0px_0px_rgba(37,99,235,1)] text-white relative group transition-transform hover:-translate-y-2 duration-300">
      <div className="absolute -top-8 -left-4 text-8xl text-brand opacity-80 select-none pointer-events-none font-serif">"</div>
      
      <blockquote className="text-xl md:text-3xl font-serif font-medium leading-relaxed mb-10 relative z-10 text-zinc-100">
        {quote}
      </blockquote>
      
      <figcaption className="flex items-center gap-4 border-t-2 border-zinc-800 pt-6">
        <div className="w-12 h-12 bg-brand rounded-none border-2 border-white flex items-center justify-center font-black text-xl overflow-hidden">
          <span className="block w-full text-center leading-none">{author}</span>
        </div>
        <div>
          <div className="font-black uppercase tracking-wider text-sm text-white">{author}</div>
          <div className="text-brand font-mono text-xs uppercase font-bold mt-1">{company}</div>
        </div>
      </figcaption>
    </figure>
  );
}

export const settings = {
  title: "Sharp Testimonial Block",
  icon: "admin-post", // Choose icons from: https://developer.wordpress.org/resource/dashicons/
  category: "design",
  attributes: {
    author: { type: "string", default: "Customize author here" },
    quote: { type: "string", default: "Customize quote here" },
    company: { type: "string", default: "Customize company here" }
  }
};
