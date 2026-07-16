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

function DestinationsGrid() {
  const { terms, loading } = useWpTerms('country');

  if (loading) return <DestinationsSkeleton />;
  if (terms.length === 0) return <DestinationsEmpty />;

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {terms.map((term) => (
        <DestinationCard
          key={term.id}
          term={term}
        />
      ))}
    </div>
  );
}
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var headingProp = (typeof __attr["heading"] !== 'undefined') ? __attr["heading"] : (typeof __attr["headingProp"] !== 'undefined' ? __attr["headingProp"] : undefined);
var subtitleProp = (typeof __attr["subtitle"] !== 'undefined') ? __attr["subtitle"] : (typeof __attr["subtitleProp"] !== 'undefined' ? __attr["subtitleProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);


  const headingMeta = useWpMeta('destinations_heading', defaults.destinations_heading);
  const subtitleMeta = useWpMeta('destinations_subtitle', defaults.destinations_subtitle);

  const heading = headingProp ?? headingMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("section", { className: `w-full ${sectionPaddingY(paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "text-center mb-10" }, createElement("h2", { className: "text-3xl font-sans font-black text-slate-800 uppercase tracking-tight" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.heading); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ heading: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (heading)), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.subtitle); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ subtitle: val }),
        className: "text-slate-500 text-sm mt-2",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-sm mt-2" }, attributes.subtitle))), createElement("div", { className: "forgewp-editor-island-placeholder", style: {padding:'14px 16px',border:'1px dashed #c3c4c7',borderRadius:'8px',background:'#f6f7f7',color:'#646970',fontSize:'12px',lineHeight:'1.55'} }, createElement("strong", { style: {display:'block',marginBottom:'6px',color:'#1d2327',fontSize:'13px'} }, "DestinationsGrid - interactive preview"), createElement("span", { style: {display:'block'} }, "This section loads live data (hotels, terms, posts) on the visitor page. Edit headings and labels in the block sidebar under Block Settings, or use any inline fields shown on the canvas above this box. The live grid/list appears on the frontend after save."))));
})()