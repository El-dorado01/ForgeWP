(() => {
var defaults = {"hero_badge":"Seit 2019 — Das unabhängige Luxushotel-Magazin","hero_title":"Wir kuratieren Ihr Reiseerlebnis","hero_subtitle":"Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels. Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt ehrliche, fundierte Empfehlungen.","hero_image_1":"https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80","hero_image_2":"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80","hero_primary_label":"Hotels entdecken","hero_secondary_label":"Kontakt aufnehmen","stats":[{"value":"500+","label":"Hotels bewertet"},{"value":"40","label":"Länder"},{"value":"80k","label":"Leser / Monat"},{"value":"6","label":"Jahre Erfahrung"}],"mission_badge":"Unsere Mission","mission_title":"Ehrliche Empfehlungen.\nKeine Kompromisse.","mission_content":"<p>Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten, wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.</p><p>Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel, das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit, die andere nicht aufwenden.</p><p>Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können — ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.</p>","mission_cta_label":"Unsere Berichte lesen","values":[{"icon":"award","title":"Unabhängige Bewertung","description":"Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.","color":"text-primary bg-primary/10"},{"icon":"shield","title":"Vertrauen & Transparenz","description":"Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.","color":"text-blue-600 bg-blue-50"},{"icon":"globe","title":"Globale Reichweite","description":"Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.","color":"text-[#929f5d] bg-[#929f5d]/10"},{"icon":"users","title":"Community-First","description":"Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.","color":"text-amber-600 bg-amber-50"}],"team_badge":"Das Team","team_title":"Unsere Redaktion","team_subtitle":"Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.","team_members":[{"name":"Isabella von Habsburg","role":"Chefredakteurin","bio":"Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.","avatar":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"},{"name":"Matteo Bianchi","role":"Reiseredakteur","bio":"Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.","avatar":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"},{"name":"Sophie Lehmann","role":"Destinations-Expertin","bio":"Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.","avatar":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80"},{"name":"Lars Eriksson","role":"Nordeuropa-Korrespondent","bio":"Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.","avatar":"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"}],"cta_heading":"Ihr nächstes","cta_heading_colored":"Traumhotel","cta_heading_end":"wartet auf Sie","cta_subtitle":"Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und einzigartigen Unterkünften weltweit.","cta_primary_label":"Hotels entdecken","cta_secondary_label":"Kontakt aufnehmen"};
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
var image1Prop = (typeof __attr["image1"] !== 'undefined') ? __attr["image1"] : (typeof __attr["image1Prop"] !== 'undefined' ? __attr["image1Prop"] : undefined);
var image2Prop = (typeof __attr["image2"] !== 'undefined') ? __attr["image2"] : (typeof __attr["image2Prop"] !== 'undefined' ? __attr["image2Prop"] : undefined);
var primaryProp = (typeof __attr["primaryButtonLabel"] !== 'undefined') ? __attr["primaryButtonLabel"] : (typeof __attr["primaryProp"] !== 'undefined' ? __attr["primaryProp"] : undefined);
var secondaryProp = (typeof __attr["secondaryButtonLabel"] !== 'undefined') ? __attr["secondaryButtonLabel"] : (typeof __attr["secondaryProp"] !== 'undefined' ? __attr["secondaryProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

function imageUrl(val, fallback){
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'url' in val) {
    return String((val).url || fallback);
  }
  return fallback;
}


  const badgeMeta = useWpMeta('hero_badge', defaults.hero_badge);
  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const image1Meta = useWpMeta('hero_image_1', imageUrl(defaults.hero_image_1, ''));
  const image2Meta = useWpMeta('hero_image_2', imageUrl(defaults.hero_image_2, ''));
  const primaryMeta = useWpMeta('hero_primary_label', defaults.hero_primary_label);
  const secondaryMeta = useWpMeta('hero_secondary_label', defaults.hero_secondary_label);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const primaryButtonLabel = primaryProp ?? primaryMeta;
  const secondaryButtonLabel = secondaryProp ?? secondaryMeta;
  const img1 = imageUrl(
    image1Prop ?? image1Meta,
    imageUrl(defaults.hero_image_1, ''),
  );
  const img2 = imageUrl(
    image2Prop ?? image2Meta,
    imageUrl(defaults.hero_image_2, ''),
  );
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const homeHref = useWpPageLink('front-page', '/');
  const contactHref = useWpPageLink('kontakt-page', '/contact');
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');

  
return createElement("div", { className: `relative overflow-hidden bg-slate-50 w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" }), createElement("div", { className: "absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" }), createElement("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10" }, createElement("nav", { className: "flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4 w-full min-w-0" }, createElement("WpLink", { href: homeHref, className: "hover:text-primary transition-colors whitespace-nowrap shrink-0" }, "Startseite"), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 shrink-0"}, createElement("path", {"d":"m9 18 6-6-6-6"})), createElement("span", { className: "text-slate-700 truncate min-w-0" }, "Über uns")), createElement("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-10 items-center" }, createElement("div", { className: "lg:col-span-3 max-w-2xl" }, createElement("span", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5 fill-primary"}, createElement("path", {"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"})), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.badge); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h1", { className: "text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-4 whitespace-pre-line" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.title); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ title: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (title)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.subtitle); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ subtitle: val }),
        className: "text-slate-500 text-sm sm:text-base leading-relaxed mb-6"
      })) : (createElement("div", { className: "text-slate-500 text-sm sm:text-base leading-relaxed mb-6", dangerouslySetInnerHTML: { __html: attributes.subtitle } })), createElement("div", { className: "flex flex-wrap gap-3" }, createElement("WpLink", { href: hotelsHref, className: "relative overflow-hidden inline-flex items-center justify-center bg-primary text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-colors duration-500 group select-none shadow-none cursor-pointer active:scale-95 shrink-0 hover:bg-primary/90" }, createElement("span", { className: "relative z-10 flex items-center gap-2" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.primaryButtonLabel); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ primaryButtonLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (primaryButtonLabel), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))), createElement("WpLink", { href: contactHref, className: "inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.secondaryButtonLabel); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ secondaryButtonLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (secondaryButtonLabel)))), createElement("div", { className: "lg:col-span-2 relative hidden lg:flex items-center justify-center h-[340px] select-none" }, createElement("div", { className: "absolute top-4 right-10 w-64 h-72 rounded-2xl overflow-hidden shadow-lg rotate-6 hover:rotate-2 transition-transform duration-500 ease-out" }, createElement("img", { src: img1, alt: "Resort Pool", className: "w-full h-full object-cover select-none pointer-events-none" })), createElement("div", { className: "absolute bottom-4 left-6 w-60 h-64 rounded-2xl overflow-hidden shadow-2xl -rotate-6 hover:rotate-0 transition-transform duration-500 ease-out z-10" }, createElement("img", { src: img2, alt: "Luxury Suite", className: "w-full h-full object-cover select-none pointer-events-none" }))))));
})()