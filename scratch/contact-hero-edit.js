(() => {
var defaults = {"hero_badge":"Wir sind für Sie da","hero_title":"Schreiben Sie uns","hero_subtitle":"Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.","card_image":"https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80","card_badge":"Hauptredaktion Wien","form_title":"Kontaktformular","form_description":"Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.","details_heading":"Kontaktdaten","social_heading":"Social Media"};
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
var titleProp = (typeof __attr["title"] !== 'undefined') ? __attr["title"] : (typeof __attr["titleProp"] !== 'undefined' ? __attr["titleProp"] : undefined);
var subtitleProp = (typeof __attr["subtitle"] !== 'undefined') ? __attr["subtitle"] : (typeof __attr["subtitleProp"] !== 'undefined' ? __attr["subtitleProp"] : undefined);
var cardImageProp = (typeof __attr["cardImage"] !== 'undefined') ? __attr["cardImage"] : (typeof __attr["cardImageProp"] !== 'undefined' ? __attr["cardImageProp"] : undefined);
var cardBadgeProp = (typeof __attr["cardBadge"] !== 'undefined') ? __attr["cardBadge"] : (typeof __attr["cardBadgeProp"] !== 'undefined' ? __attr["cardBadgeProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

function imageUrl(val, fallback){
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'url' in val) {
    return String((val).url || fallback);
  }
  return fallback;
}


  const { __ } = useWpI18n();
  const homeHref = useWpPageLink('front-page', '/');

  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const cardImageMeta = useWpMeta(
    'card_image',
    imageUrl(defaults.card_image, ''),
  );
  const cardBadgeMeta = useWpMeta('card_badge', defaults.card_badge);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const cardImage = imageUrl(
    cardImageProp ?? cardImageMeta,
    imageUrl(defaults.card_image, ''),
  );
  const cardBadge = cardBadgeProp ?? cardBadgeMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("div", { className: `relative overflow-hidden bg-slate-50 w-full ${sectionPaddingY(paddingY)}` }, createElement("div", { className: "absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" }), createElement("div", { className: "absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" }), createElement("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10" }, createElement("nav", { className: "flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0" }, createElement(WpLink, { href: homeHref, className: "hover:text-primary transition-colors whitespace-nowrap shrink-0" }, __('Startseite')), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 shrink-0"}, createElement("path", {"d":"m9 18 6-6-6-6"})), createElement("span", { className: "text-slate-700 truncate min-w-0" }, __('Kontakt'))), createElement("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-10 items-center" }, createElement("div", { className: "lg:col-span-3 max-w-2xl" }, createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5"}, createElement("path", {"d":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.badge); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h1", { className: "text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.title); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ title: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (title)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.subtitle); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ subtitle: val }),
        className: "text-slate-500 text-sm sm:text-base leading-relaxed",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-sm sm:text-base leading-relaxed" }, attributes.subtitle))), createElement("div", { className: "lg:col-span-2 relative hidden lg:flex items-center justify-center h-[200px] select-none" }, createElement("div", { className: "relative w-72 h-44 rounded-2xl overflow-hidden shadow-xl rotate-2 hover:rotate-0 transition-transform duration-500 ease-out" }, createElement("img", { src: attributes.cardImage, alt: __('Wien Redaktion'), className: "w-full h-full object-cover select-none pointer-events-none" }), createElement("div", { className: "absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" }), createElement("div", { className: "absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3 h-3 text-primary"}, createElement("path", {"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}), createElement("circle", {"cx":"12","cy":"10","r":"3"})), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.cardBadge); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ cardBadge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("span", null, attributes.cardBadge))))))));
})()