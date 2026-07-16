(() => {

  const badgeMeta = useWpMeta('featured_badge', defaults.featured_badge);
  const headingMeta = useWpMeta('featured_heading', defaults.featured_heading);
  const subtitleMeta = useWpMeta('featured_subtitle', defaults.featured_subtitle);
  const linkMeta = useWpMeta('featured_link_label', defaults.featured_link_label);

  const badge = setAttributes ? (badgeProp ?? badgeMeta) : badgeMeta;
  const heading = setAttributes ? (headingProp ?? headingMeta) : headingMeta;
  const subtitle = setAttributes ? (subtitleProp ?? subtitleMeta) : subtitleMeta;
  const linkLabel = setAttributes ? (linkProp ?? linkMeta) : linkMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const hotelsHref = useWpPageLink('hotels-page', '/hotels');

  
return createElement("section", { className: `w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "flex items-end justify-between mb-10" }, createElement("div", null, createElement("span", { className: "text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.badge) || '',
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h2", { className: "text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.heading) || '',
        onChange: (val) => setAttributes({ heading: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (heading)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.subtitle) || '',
        onChange: (val) => setAttributes({ subtitle: val }),
        className: "text-slate-500 text-sm mt-1 max-w-md",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-sm mt-1 max-w-md" }, attributes.subtitle))), createElement("WpLink", { href: hotelsHref, className: "hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.linkLabel) || '',
        onChange: (val) => setAttributes({ linkLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (linkLabel), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))), createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8" }, [1, 2, 3].map((i) => (createElement("div", { key: i, className: "bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse" }, createElement("div", { className: "h-60 bg-slate-100" }), createElement("div", { className: "p-6 space-y-3" }, createElement("div", { className: "h-3 bg-slate-100 rounded w-1/3" }), createElement("div", { className: "h-5 bg-slate-100 rounded w-3/4" }))))))));
})()