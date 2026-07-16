(() => {
var defaults = {"hero_title":"Handverlesene","hero_title_colored":"Boutique- & Luxushotels","hero_subtitle":"Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.","hero_search_placeholder":"Hotelname oder Stadt suchen...","trust_stat1_value":"500+","trust_stat1_label":"Kuratierte Hotels","trust_stat2_value":"4","trust_stat2_label":"Länder abgedeckt","trust_stat3_value":"100%","trust_stat3_label":"Unabhängig & redaktionell","trust_stat4_value":"DE / EN","trust_stat4_label":"Deutsch & Englisch","featured_badge":"Empfohlen","featured_heading":"Ausgewählte Hotels","featured_subtitle":"Von unserer Redaktion handverlesen — außergewöhnliche Aufenthalte in ganz Europa.","featured_link_label":"Alle Hotels","editorial_badge":"Redaktionell & Unabhängig","editorial_heading":"Kuratiert von","editorial_heading_colored":"echten Reisenden","editorial_description":"Kein bezahltes Ranking. Kein Algorithmus. Nur ehrliche, redaktionell geprüfte Empfehlungen von unserem Team, das die Hotels selbst besucht hat.","editorial_cta_label":"Alle Hotelvergleiche lesen","editorial_feature1_label":"Vor-Ort-Besuche","editorial_feature1_desc":"Jedes Hotel wird persönlich getestet","editorial_feature2_label":"Keine Werbung","editorial_feature2_desc":"Vollständig redaktionell unabhängig","editorial_feature3_label":"DE & EN","editorial_feature3_desc":"Inhalte auf Deutsch und Englisch","editorial_feature4_label":"Laufend aktuell","editorial_feature4_desc":"Regelmäßige neue Empfehlungen","listicles_badge":"Magazin","listicles_heading":"Aktuelle Hotelvergleiche","listicles_subtitle":"Tiefgehende Reiseberichte und Empfehlungen von unserer Redaktion.","listicles_link_label":"Alle Vergleiche","destinations_heading":"Nach Reiseziel entdecken","destinations_subtitle":"Handverlesene Hotels in den schönsten Reisezielen Europas."};
var BAKED_PADDING = "sm";
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
var v1p = (typeof __attr["stat1Value"] !== 'undefined') ? __attr["stat1Value"] : (typeof __attr["v1p"] !== 'undefined' ? __attr["v1p"] : undefined);
var l1p = (typeof __attr["stat1Label"] !== 'undefined') ? __attr["stat1Label"] : (typeof __attr["l1p"] !== 'undefined' ? __attr["l1p"] : undefined);
var v2p = (typeof __attr["stat2Value"] !== 'undefined') ? __attr["stat2Value"] : (typeof __attr["v2p"] !== 'undefined' ? __attr["v2p"] : undefined);
var l2p = (typeof __attr["stat2Label"] !== 'undefined') ? __attr["stat2Label"] : (typeof __attr["l2p"] !== 'undefined' ? __attr["l2p"] : undefined);
var v3p = (typeof __attr["stat3Value"] !== 'undefined') ? __attr["stat3Value"] : (typeof __attr["v3p"] !== 'undefined' ? __attr["v3p"] : undefined);
var l3p = (typeof __attr["stat3Label"] !== 'undefined') ? __attr["stat3Label"] : (typeof __attr["l3p"] !== 'undefined' ? __attr["l3p"] : undefined);
var v4p = (typeof __attr["stat4Value"] !== 'undefined') ? __attr["stat4Value"] : (typeof __attr["v4p"] !== 'undefined' ? __attr["v4p"] : undefined);
var l4p = (typeof __attr["stat4Label"] !== 'undefined') ? __attr["stat4Label"] : (typeof __attr["l4p"] !== 'undefined' ? __attr["l4p"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

const cell = (
    value,
    label,
    valueKey,
    labelKey,
  ) => (createElement("div", { className: "flex flex-col items-center gap-1" }, setAttributes ? (createElement(wp.element.Fragment, null, createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (value); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ [valueKey]: val }),
        className: "text-2xl font-black text-slate-900 font-sans",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (label); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ [labelKey]: val }),
        className: "text-[10px] font-bold uppercase tracking-wider text-slate-400",
        disableLineBreaks: true,
        allowedFormats: []
      }))) : (createElement(wp.element.Fragment, null, createElement("span", { className: "text-2xl font-black text-slate-900 font-sans" }, value), createElement("span", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400" }, label)))));


  const v1m = useWpMeta('trust_stat1_value', defaults.trust_stat1_value);
  const l1m = useWpMeta('trust_stat1_label', defaults.trust_stat1_label);
  const v2m = useWpMeta('trust_stat2_value', defaults.trust_stat2_value);
  const l2m = useWpMeta('trust_stat2_label', defaults.trust_stat2_label);
  const v3m = useWpMeta('trust_stat3_value', defaults.trust_stat3_value);
  const l3m = useWpMeta('trust_stat3_label', defaults.trust_stat3_label);
  const v4m = useWpMeta('trust_stat4_value', defaults.trust_stat4_value);
  const l4m = useWpMeta('trust_stat4_label', defaults.trust_stat4_label);

  const stat1Value = v1p ?? v1m;
  const stat1Label = l1p ?? l1m;
  const stat2Value = v2p ?? v2m;
  const stat2Label = l2p ?? l2m;
  const stat3Value = v3p ?? v3m;
  const stat3Label = l3p ?? l3m;
  const stat4Value = v4p ?? v4m;
  const stat4Label = l4p ?? l4m;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("div", { className: `bg-white w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 text-center" }, [cell(stat1Value, stat1Label, 'stat1Value', 'stat1Label'), cell(stat2Value, stat2Label, 'stat2Value', 'stat2Label'), cell(stat3Value, stat3Label, 'stat3Value', 'stat3Label'), cell(stat4Value, stat4Label, 'stat4Value', 'stat4Label')])));
})()