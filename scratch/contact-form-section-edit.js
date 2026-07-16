(() => {
var defaults = {"hero_badge":"Wir sind für Sie da","hero_title":"Schreiben Sie uns","hero_subtitle":"Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.","card_image":"https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80","card_badge":"Hauptredaktion Wien","form_title":"Kontaktformular","form_description":"Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.","details_heading":"Kontaktdaten","social_heading":"Social Media"};
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
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var titleProp = (typeof __attr["formTitle"] !== 'undefined') ? __attr["formTitle"] : (typeof __attr["titleProp"] !== 'undefined' ? __attr["titleProp"] : undefined);
var descProp = (typeof __attr["formDescription"] !== 'undefined') ? __attr["formDescription"] : (typeof __attr["descProp"] !== 'undefined' ? __attr["descProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);


  const titleMeta = useWpMeta('form_title', defaults.form_title);
  const descMeta = useWpMeta('form_description', defaults.form_description);

  const formTitle = titleProp ?? titleMeta;
  const formDescription = descProp ?? descMeta;
  const paddingY = resolveBlockPaddingY(
    setAttributes,
    paddingYProp,
    BAKED_PADDING,
  );
  const pad = sectionPaddingY(attributes.paddingY);

  
return createElement("div", { className: `w-full min-w-0 ${pad}`.trim() }, setAttributes && (createElement("div", { className: "mb-3 space-y-1" }, createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.formTitle); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ formTitle: val }),
        className: "text-xs font-mono text-slate-400",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.formDescription); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ formDescription: val }),
        className: "text-xs font-mono text-slate-400",
        disableLineBreaks: true,
        allowedFormats: []
      }))), createElement("div", { className: "forgewp-editor-island-placeholder", style: {padding:'14px 16px',border:'1px dashed #c3c4c7',borderRadius:'8px',background:'#f6f7f7',color:'#646970',fontSize:'12px',lineHeight:'1.55'} }, createElement("strong", { style: {display:'block',marginBottom:'6px',color:'#1d2327',fontSize:'13px'} }, "ContactForm - interactive preview"), createElement("span", { style: {display:'block'} }, "This section is interactive on the live site (forms, state, live data). Edit text and options in the block sidebar under Block Settings, or use any inline fields shown on the canvas above/below this box. The full interactive UI appears on the visitor page.")));
})()