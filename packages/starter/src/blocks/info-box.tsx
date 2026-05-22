import { defineBlock } from "@forgewp/react";

export default defineBlock({
  name: "info-box",
  title: "ForgeWP Info Box",
  category: "design",
  icon: "info",
  attributes: {
    title: { type: "string", default: "Important Alert" },
    content: { type: "string", default: "Please read this important notice regarding layout optimization." },
    type: { type: "string", default: "info" } // info | success | warning
  },
  edit: ({ attributes, setAttributes }) => {
    return (
      <div className={`p-4 border-l-4 rounded-r shadow-sm font-sans ${
        attributes.type === "success" ? "bg-emerald-50 border-emerald-500 text-emerald-900" :
        attributes.type === "warning" ? "bg-amber-50 border-amber-500 text-amber-900" :
        "bg-sky-50 border-sky-500 text-sky-900"
      }`}>
        <input 
          type="text" 
          value={attributes.title} 
          onChange={(e) => setAttributes({ title: e.target.value })}
          className="font-bold bg-transparent border-none outline-none block w-full text-lg mb-1" 
          placeholder="Info Box Title"
        />
        <textarea 
          value={attributes.content} 
          onChange={(e) => setAttributes({ content: e.target.value })}
          className="bg-transparent border-none outline-none block w-full text-sm resize-none"
          placeholder="Details..."
          rows={2}
        />
      </div>
    );
  },
  save: ({ attributes }) => {
    return (
      <div className={`p-4 border-l-4 rounded-r shadow-sm font-sans ${
        attributes.type === "success" ? "bg-emerald-50 border-emerald-500 text-emerald-900" :
        attributes.type === "warning" ? "bg-amber-50 border-amber-500 text-amber-900" :
        "bg-sky-50 border-sky-500 text-sky-900"
      }`}>
        <h3 className="font-bold text-lg mb-1">{attributes.title}</h3>
        <p className="text-sm">{attributes.content}</p>
      </div>
    );
  }
});
