export default function TestimonialBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 bg-white border-4 border-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none my-6 selection:bg-brand selection:text-white">
      <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-3 border-2 border-zinc-950">
        Gutenberg Custom Block
      </span>
      <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight leading-none mb-3">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 font-medium font-sans leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export const settings = {
  title: "Sharp Testimonial Block",
  icon: "admin-post", // Choose icons from: https://developer.wordpress.org/resource/dashicons/
  category: "design",
  attributes: {
    title: { type: "string", default: "Enter Title Content Here" },
    description: { type: "string", default: "Enter a detailed description to display inside this dynamic Neo-Brutalist layout." }
  }
};
