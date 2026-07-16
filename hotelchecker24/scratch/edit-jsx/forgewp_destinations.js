(() => {

  const headingMeta = useWpMeta('destinations_heading', defaults.destinations_heading);
  const subtitleMeta = useWpMeta('destinations_subtitle', defaults.destinations_subtitle);

  const heading = setAttributes ? (headingProp ?? headingMeta) : headingMeta;
  const subtitle = setAttributes ? (subtitleProp ?? subtitleMeta) : subtitleMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("section", { className: `w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "text-center mb-10" }, createElement("h2", { className: "text-3xl font-sans font-black text-slate-800 uppercase tracking-tight" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
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
        className: "text-slate-500 text-sm mt-2",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-sm mt-2" }, attributes.subtitle))), createElement("DestinationsSkeleton", null)));
})()