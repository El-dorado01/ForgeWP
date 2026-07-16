(() => {
var defaults = {"hero_title":"Handverlesene","hero_title_colored":"Boutique- & Luxushotels","hero_subtitle":"Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.","hero_search_placeholder":"Hotelname oder Stadt suchen...","trust_stat1_value":"500+","trust_stat1_label":"Kuratierte Hotels","trust_stat2_value":"4","trust_stat2_label":"Länder abgedeckt","trust_stat3_value":"100%","trust_stat3_label":"Unabhängig & redaktionell","trust_stat4_value":"DE / EN","trust_stat4_label":"Deutsch & Englisch","featured_badge":"Empfohlen","featured_heading":"Ausgewählte Hotels","featured_subtitle":"Von unserer Redaktion handverlesen — außergewöhnliche Aufenthalte in ganz Europa.","featured_link_label":"Alle Hotels","editorial_badge":"Redaktionell & Unabhängig","editorial_heading":"Kuratiert von","editorial_heading_colored":"echten Reisenden","editorial_description":"Kein bezahltes Ranking. Kein Algorithmus. Nur ehrliche, redaktionell geprüfte Empfehlungen von unserem Team, das die Hotels selbst besucht hat.","editorial_cta_label":"Alle Hotelvergleiche lesen","editorial_feature1_label":"Vor-Ort-Besuche","editorial_feature1_desc":"Jedes Hotel wird persönlich getestet","editorial_feature2_label":"Keine Werbung","editorial_feature2_desc":"Vollständig redaktionell unabhängig","editorial_feature3_label":"DE & EN","editorial_feature3_desc":"Inhalte auf Deutsch und Englisch","editorial_feature4_label":"Laufend aktuell","editorial_feature4_desc":"Regelmäßige neue Empfehlungen","listicles_badge":"Magazin","listicles_heading":"Aktuelle Hotelvergleiche","listicles_subtitle":"Tiefgehende Reiseberichte und Empfehlungen von unserer Redaktion.","listicles_link_label":"Alle Vergleiche","destinations_heading":"Nach Reiseziel entdecken","destinations_subtitle":"Handverlesene Hotels in den schönsten Reisezielen Europas."};
var BAKED_PADDING = "md";
var SECTION_PADDING_Y = {"none":"","sm":"py-4 sm:py-6","md":"py-8 sm:py-10","lg":"py-12 sm:py-16"};

function resolveBlockPaddingY(
  setAttributes,
  prop,
  bakedDefault,
){
  if (!setAttributes) return bakedDefault;
  if (prop && prop in SECTION_PADDING_Y) return prop;
  return bakedDefault;
}

function sectionPaddingY(
  value,
  fallback= 'md',
){
  if (value && value in SECTION_PADDING_Y) {
    return SECTION_PADDING_Y[value];
  }
  return SECTION_PADDING_Y[fallback];
}
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var badgeProp = (typeof __attr["badge"] !== 'undefined') ? __attr["badge"] : (typeof __attr["badgeProp"] !== 'undefined' ? __attr["badgeProp"] : undefined);
var headingProp = (typeof __attr["heading"] !== 'undefined') ? __attr["heading"] : (typeof __attr["headingProp"] !== 'undefined' ? __attr["headingProp"] : undefined);
var headingColoredProp = (typeof __attr["headingColored"] !== 'undefined') ? __attr["headingColored"] : (typeof __attr["headingColoredProp"] !== 'undefined' ? __attr["headingColoredProp"] : undefined);
var descriptionProp = (typeof __attr["description"] !== 'undefined') ? __attr["description"] : (typeof __attr["descriptionProp"] !== 'undefined' ? __attr["descriptionProp"] : undefined);
var ctaLabelProp = (typeof __attr["ctaLabel"] !== 'undefined') ? __attr["ctaLabel"] : (typeof __attr["ctaLabelProp"] !== 'undefined' ? __attr["ctaLabelProp"] : undefined);
var f1lProp = (typeof __attr["feature1Label"] !== 'undefined') ? __attr["feature1Label"] : (typeof __attr["f1lProp"] !== 'undefined' ? __attr["f1lProp"] : undefined);
var f1dProp = (typeof __attr["feature1Desc"] !== 'undefined') ? __attr["feature1Desc"] : (typeof __attr["f1dProp"] !== 'undefined' ? __attr["f1dProp"] : undefined);
var f2lProp = (typeof __attr["feature2Label"] !== 'undefined') ? __attr["feature2Label"] : (typeof __attr["f2lProp"] !== 'undefined' ? __attr["f2lProp"] : undefined);
var f2dProp = (typeof __attr["feature2Desc"] !== 'undefined') ? __attr["feature2Desc"] : (typeof __attr["f2dProp"] !== 'undefined' ? __attr["f2dProp"] : undefined);
var f3lProp = (typeof __attr["feature3Label"] !== 'undefined') ? __attr["feature3Label"] : (typeof __attr["f3lProp"] !== 'undefined' ? __attr["f3lProp"] : undefined);
var f3dProp = (typeof __attr["feature3Desc"] !== 'undefined') ? __attr["feature3Desc"] : (typeof __attr["f3dProp"] !== 'undefined' ? __attr["f3dProp"] : undefined);
var f4lProp = (typeof __attr["feature4Label"] !== 'undefined') ? __attr["feature4Label"] : (typeof __attr["f4lProp"] !== 'undefined' ? __attr["f4lProp"] : undefined);
var f4dProp = (typeof __attr["feature4Desc"] !== 'undefined') ? __attr["feature4Desc"] : (typeof __attr["f4dProp"] !== 'undefined' ? __attr["f4dProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);


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

  const badge = badgeProp ?? badgeMeta;
  const heading = headingProp ?? headingMeta;
  const headingColored = headingColoredProp ?? headingColoredMeta;
  const description = descriptionProp ?? descriptionMeta;
  const ctaLabel = ctaLabelProp ?? ctaLabelMeta;
  const feature1Label = f1lProp ?? f1lMeta;
  const feature1Desc = f1dProp ?? f1dMeta;
  const feature2Label = f2lProp ?? f2lMeta;
  const feature2Desc = f2dProp ?? f2dMeta;
  const feature3Label = f3lProp ?? f3lMeta;
  const feature3Desc = f3dProp ?? f3dMeta;
  const feature4Label = f4lProp ?? f4lMeta;
  const feature4Desc = f4dProp ?? f4dMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');

  
return createElement("section", { className: `w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "bg-[#121416] rounded-3xl overflow-hidden px-8 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative" }, createElement("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(146,159,93,0.15)_0%,transparent_60%)] pointer-events-none" }), createElement("div", { className: "relative z-10" }, createElement("span", { className: "text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-md inline-block mb-4" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.badge); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h2", { className: "text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.heading); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ heading: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (heading), createElement("br", null), createElement("span", { className: "text-[#929f5d]" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.headingColored); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ headingColored: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (headingColored))), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.description); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ description: val }),
        className: "text-slate-400 text-sm leading-relaxed mb-6 max-w-sm",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-400 text-sm leading-relaxed mb-6 max-w-sm" }, attributes.description)), createElement("WpLink", { href: listiclesHref, className: "inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all duration-300 active:scale-95" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.ctaLabel); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ ctaLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (ctaLabel), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))), createElement("div", { className: "relative z-10 grid grid-cols-2 gap-3" }, createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "01"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.feature1Label); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature1Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature1Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.feature1Desc); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature1Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature1Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "02"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.feature2Label); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature2Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature2Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.feature2Desc); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature2Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature2Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "03"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.feature3Label); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature3Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature3Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.feature3Desc); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature3Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature3Desc))), createElement("div", { className: "bg-white/5 border border-white/10 rounded-2xl p-4" }, createElement("span", { className: "text-[10px] font-mono font-black text-[#929f5d]" }, "04"), createElement("p", { className: "text-white text-xs font-bold uppercase tracking-wide mt-1" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.feature4Label); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature4Label: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (feature4Label)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.feature4Desc); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ feature4Desc: val }),
        className: "text-slate-500 text-[10px] mt-1 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-[10px] mt-1 leading-snug" }, attributes.feature4Desc)))))));
})()