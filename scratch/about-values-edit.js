(() => {
var defaults = {"hero_badge":"Seit 2019 — Das unabhängige Luxushotel-Magazin","hero_title":"Wir kuratieren Ihr Reiseerlebnis","hero_subtitle":"Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels. Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt ehrliche, fundierte Empfehlungen.","hero_image_1":"https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80","hero_image_2":"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80","hero_primary_label":"Hotels entdecken","hero_secondary_label":"Kontakt aufnehmen","stats":[{"value":"500+","label":"Hotels bewertet"},{"value":"40","label":"Länder"},{"value":"80k","label":"Leser / Monat"},{"value":"6","label":"Jahre Erfahrung"}],"mission_badge":"Unsere Mission","mission_title":"Ehrliche Empfehlungen.\nKeine Kompromisse.","mission_content":"<p>Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten, wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.</p><p>Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel, das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit, die andere nicht aufwenden.</p><p>Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können — ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.</p>","mission_cta_label":"Unsere Berichte lesen","values":[{"icon":"award","title":"Unabhängige Bewertung","description":"Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.","color":"text-primary bg-primary/10"},{"icon":"shield","title":"Vertrauen & Transparenz","description":"Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.","color":"text-blue-600 bg-blue-50"},{"icon":"globe","title":"Globale Reichweite","description":"Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.","color":"text-[#929f5d] bg-[#929f5d]/10"},{"icon":"users","title":"Community-First","description":"Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.","color":"text-amber-600 bg-amber-50"}],"team_badge":"Das Team","team_title":"Unsere Redaktion","team_subtitle":"Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.","team_members":[{"name":"Isabella von Habsburg","role":"Chefredakteurin","bio":"Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.","avatar":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"},{"name":"Matteo Bianchi","role":"Reiseredakteur","bio":"Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.","avatar":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"},{"name":"Sophie Lehmann","role":"Destinations-Expertin","bio":"Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.","avatar":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80"},{"name":"Lars Eriksson","role":"Nordeuropa-Korrespondent","bio":"Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.","avatar":"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"}],"cta_heading":"Ihr nächstes","cta_heading_colored":"Traumhotel","cta_heading_end":"wartet auf Sie","cta_subtitle":"Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und einzigartigen Unterkünften weltweit.","cta_primary_label":"Hotels entdecken","cta_secondary_label":"Kontakt aufnehmen"};
var BAKED_PADDING = "none";
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
// Icon map stub for VALUE_ICONS
var VALUE_ICONS = { "award": function(pr) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("award", pr && (pr.className || pr.class) || '', 'lucide') : null; }, "shield": function(pr) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("shield", pr && (pr.className || pr.class) || '', 'lucide') : null; }, "globe": function(pr) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("globe", pr && (pr.className || pr.class) || '', 'lucide') : null; }, "users": function(pr) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("users", pr && (pr.className || pr.class) || '', 'lucide') : null; }, "star": function(pr) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("star", pr && (pr.className || pr.class) || '', 'lucide') : null; } };
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var valuesProp = (typeof __attr["values"] !== 'undefined') ? __attr["values"] : (typeof __attr["valuesProp"] !== 'undefined' ? __attr["valuesProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

function ValueIcon({ name, className }) {
  const slug = (name || 'award').toLowerCase();
  const Static = VALUE_ICONS[slug];
  if (Static) return createElement(Static, { className: className, "aria-hidden": true });
  return forgeWpRenderIcon(slug, className, "lucide");
}


  const valuesMeta = useWpMeta('values', defaults.values);
  const rows = Array.isArray(valuesProp)
    ? valuesProp
    : Array.isArray(valuesMeta)
      ? valuesMeta
      : (defaults.values);
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);
  const pad = sectionPaddingY(attributes.paddingY);

  
return createElement("div", { className: `grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0 ${pad}`.trim() }, rows.map((row, index) => (createElement("div", { key: index, className: "bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow" }, createElement("div", { className: 'w-10 h-10 rounded-xl flex items-center justify-center mb-3 ' +
              (row.color?.replace(/\bborder[^\s]*/g, '').trim() ||
                'text-primary bg-primary/10') }, createElement(ValueIcon, { name: row.icon, className: "w-5 h-5" })), setAttributes ? (createElement(wp.element.Fragment, null, createElement(wp.blockEditor.RichText, {
        tagName: "h3",
        value: (function(){ var __v = (row.title || ''); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) =>
                  setAttributes({
                    values: rows.map((r, i) => (i === index ? { ...r, title: val } : r)),
                  }),
        className: "text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (row.description || ''); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) =>
                  setAttributes({
                    values: rows.map((r, i) => (i === index ? { ...r, description: val } : r)),
                  }),
        className: "text-xs sm:text-sm text-slate-500 leading-relaxed"
      }))) : (createElement(wp.element.Fragment, null, createElement("h3", { className: "text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug" }, row.title), createElement("p", { className: "text-xs sm:text-sm text-slate-500 leading-relaxed" }, row.description)))))));
})()