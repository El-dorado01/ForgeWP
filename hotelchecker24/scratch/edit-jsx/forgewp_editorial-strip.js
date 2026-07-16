(() => {

  const badgeMeta = useWpMeta('editorial_badge', defaults.editorial_badge);
  const headingMeta = useWpMeta('editorial_heading', defaults.editorial_heading);
  const headingColoredMeta = useWpMeta(
    'editorial_heading_colored',
    defaults.editorial_heading_colored,
  );
  const descriptionMeta = useWpMeta('editorial_description', defaults.editorial_description);
  const ctaLabelMeta = useWpMeta('editorial_cta_label', defaults.editorial_cta_label);
  const f1lMeta = useWpMeta('editorial_feature1_label', defaults.editorial_feature1_label);
  const f1dMeta = useWpMeta('editorial_feature1_desc', defaults.editorial_feature1_desc);
  const f2lMeta = useWpMeta('editorial_feature2_label', defaults.editorial_feature2_label);
  const f2dMeta = useWpMeta('editorial_feature2_desc', defaults.editorial_feature2_desc);
  const f3lMeta = useWpMeta('editorial_feature3_label', defaults.editorial_feature3_label);
  const f3dMeta = useWpMeta('editorial_feature3_desc', defaults.editorial_feature3_desc);
  const f4lMeta = useWpMeta('editorial_feature4_label', defaults.editorial_feature4_label);
  const f4dMeta = useWpMeta('editorial_feature4_desc', defaults.editorial_feature4_desc);

  const badge = setAttributes ? (badgeProp ?? badgeMeta) : badgeMeta;
  const heading = setAttributes ? (headingProp ?? headingMeta) : headingMeta;
  const headingColored = setAttributes
    ? (headingColoredProp ?? headingColoredMeta)
    : headingColoredMeta;
  const description = setAttributes ? (descriptionProp ?? descriptionMeta) : descriptionMeta;
  const ctaLabel = setAttributes ? (ctaLabelProp ?? ctaLabelMeta) : ctaLabelMeta;
  const feature1Label = setAttributes ? (f1lProp ?? f1lMeta) : f1lMeta;
  const feature1Desc = setAttributes ? (f1dProp ?? f1dMeta) : f1dMeta;
  const feature2Label = setAttributes ? (f2lProp ?? f2lMeta) : f2lMeta;
  const feature2Desc = setAttributes ? (f2dProp ?? f2dMeta) : f2dMeta;
  const feature3Label = setAttributes ? (f3lProp ?? f3lMeta) : f3lMeta;
  const feature3Desc = setAttributes ? (f3dProp ?? f3dMeta) : f3dMeta;
  const feature4Label = setAttributes ? (f4lProp ?? f4lMeta) : f4lMeta;
  const feature4Desc = setAttributes ? (f4dProp ?? f4dMeta) : f4dMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');

  
return createElement("section", { className: `w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "bg-[#121416] rounded-3xl overflow-hidden px-8 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative" }, createElement("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(146,159,93,0.15)_0%,transparent_60%)] pointer-events-none" }), createElement("div", { className: "relative z-10" }, createElement("span", { className: "text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-md inline-block mb-4" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.badge) || '',
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h2", { className: "text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.heading) || '',
        onChange: (val) => setAttributes({ heading: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (heading), createElement("br", null), createElement("span", { className: "text-[#929f5d]" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.headingColored) || '',
        onChange: (val) => setAttributes({ headingColored: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (headingColored))), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.description) || '',
        onChange: (val) => setAttributes({ description: val }),
        className: "text-slate-400 text-sm leading-relaxed mb-6 max-w-sm",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-400 text-sm leading-relaxed mb-6 max-w-sm" }, attributes.description)), createElement("WpLink", { href: listiclesHref, className: "inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all duration-300 active:scale-95" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.ctaLabel) || '',
        onChange: (val) => setAttributes({ ctaLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (ctaLabel), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))), createElement("div", { className: "relative z-10 grid grid-cols-2 gap-3" }, createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "01"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.feature1Label) || '',
        onChange: (val) => setAttributes({ feature1Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature1Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.feature1Desc) || '',
        onChange: (val) => setAttributes({ feature1Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature1Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "02"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.feature2Label) || '',
        onChange: (val) => setAttributes({ feature2Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature2Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.feature2Desc) || '',
        onChange: (val) => setAttributes({ feature2Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature2Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "03"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.feature3Label) || '',
        onChange: (val) => setAttributes({ feature3Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature3Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.feature3Desc) || '',
        onChange: (val) => setAttributes({ feature3Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature3Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "04"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.feature4Label) || '',
        onChange: (val) => setAttributes({ feature4Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature4Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (attributes.feature4Desc) || '',
        onChange: (val) => setAttributes({ feature4Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature4Desc)))))));
})()