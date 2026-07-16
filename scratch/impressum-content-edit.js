(() => {
var defaults = {"hero_badge":"Gesetzliche Offenlegung","hero_title":"Impressum","company_heading":"Medieninhaber & Unternehmensbezeichnung","company_name":"maxonline® Marketing hfw GesmbH","company_legal_form":"Rechtsform: Gesellschaft mit beschränkter Haftung","address_heading":"Firmensitz & Anschrift","address_line_1":"Coronablick 7","address_line_2":"A-3652 Leiben","address_country":"Österreich","contact_heading":"Kontakt","contact_email":"office@max-online.at","contact_website_label":"Internet:","contact_website_url":"https://max-online.at","contact_website_display":"www.max-online.at","register_heading":"Register & Gerichtsstand","register_number_label":"Firmenbuchnummer","register_number":"FN 659087 x","vat_label":"Umsatzsteuer-ID","vat_id":"ATU82431815","court_label":"Gerichtsstandort","court_name":"Landesgericht St. Pölten","legal_heading":"Rechtliche Hinweise","business_purpose_label":"Unternehmensgegenstand","business_purpose":"Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik.","authority_label":"Aufsichtsbehörde","authority":"Bezirkshauptmannschaft Melk (gemäß E-Commerce Gesetz - ECG)","trademark_label":"Markenschutz","trademark":"maxonline® ist eine eingetragene Wortbildmarke.<br />Markenregister Aktenzeichen: AM 12102/2019<br />Register-Nr.: 305857"};
var BAKED_PADDING = "lg";
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
var companyHeadingProp = (typeof __attr["companyHeading"] !== 'undefined') ? __attr["companyHeading"] : (typeof __attr["companyHeadingProp"] !== 'undefined' ? __attr["companyHeadingProp"] : undefined);
var companyNameProp = (typeof __attr["companyName"] !== 'undefined') ? __attr["companyName"] : (typeof __attr["companyNameProp"] !== 'undefined' ? __attr["companyNameProp"] : undefined);
var companyLegalFormProp = (typeof __attr["companyLegalForm"] !== 'undefined') ? __attr["companyLegalForm"] : (typeof __attr["companyLegalFormProp"] !== 'undefined' ? __attr["companyLegalFormProp"] : undefined);
var addressHeadingProp = (typeof __attr["addressHeading"] !== 'undefined') ? __attr["addressHeading"] : (typeof __attr["addressHeadingProp"] !== 'undefined' ? __attr["addressHeadingProp"] : undefined);
var addressLine1Prop = (typeof __attr["addressLine1"] !== 'undefined') ? __attr["addressLine1"] : (typeof __attr["addressLine1Prop"] !== 'undefined' ? __attr["addressLine1Prop"] : undefined);
var addressLine2Prop = (typeof __attr["addressLine2"] !== 'undefined') ? __attr["addressLine2"] : (typeof __attr["addressLine2Prop"] !== 'undefined' ? __attr["addressLine2Prop"] : undefined);
var addressCountryProp = (typeof __attr["addressCountry"] !== 'undefined') ? __attr["addressCountry"] : (typeof __attr["addressCountryProp"] !== 'undefined' ? __attr["addressCountryProp"] : undefined);
var contactHeadingProp = (typeof __attr["contactHeading"] !== 'undefined') ? __attr["contactHeading"] : (typeof __attr["contactHeadingProp"] !== 'undefined' ? __attr["contactHeadingProp"] : undefined);
var contactEmailProp = (typeof __attr["contactEmail"] !== 'undefined') ? __attr["contactEmail"] : (typeof __attr["contactEmailProp"] !== 'undefined' ? __attr["contactEmailProp"] : undefined);
var contactWebsiteLabelProp = (typeof __attr["contactWebsiteLabel"] !== 'undefined') ? __attr["contactWebsiteLabel"] : (typeof __attr["contactWebsiteLabelProp"] !== 'undefined' ? __attr["contactWebsiteLabelProp"] : undefined);
var contactWebsiteUrlProp = (typeof __attr["contactWebsiteUrl"] !== 'undefined') ? __attr["contactWebsiteUrl"] : (typeof __attr["contactWebsiteUrlProp"] !== 'undefined' ? __attr["contactWebsiteUrlProp"] : undefined);
var contactWebsiteDisplayProp = (typeof __attr["contactWebsiteDisplay"] !== 'undefined') ? __attr["contactWebsiteDisplay"] : (typeof __attr["contactWebsiteDisplayProp"] !== 'undefined' ? __attr["contactWebsiteDisplayProp"] : undefined);
var registerHeadingProp = (typeof __attr["registerHeading"] !== 'undefined') ? __attr["registerHeading"] : (typeof __attr["registerHeadingProp"] !== 'undefined' ? __attr["registerHeadingProp"] : undefined);
var registerNumberLabelProp = (typeof __attr["registerNumberLabel"] !== 'undefined') ? __attr["registerNumberLabel"] : (typeof __attr["registerNumberLabelProp"] !== 'undefined' ? __attr["registerNumberLabelProp"] : undefined);
var registerNumberProp = (typeof __attr["registerNumber"] !== 'undefined') ? __attr["registerNumber"] : (typeof __attr["registerNumberProp"] !== 'undefined' ? __attr["registerNumberProp"] : undefined);
var vatLabelProp = (typeof __attr["vatLabel"] !== 'undefined') ? __attr["vatLabel"] : (typeof __attr["vatLabelProp"] !== 'undefined' ? __attr["vatLabelProp"] : undefined);
var vatIdProp = (typeof __attr["vatId"] !== 'undefined') ? __attr["vatId"] : (typeof __attr["vatIdProp"] !== 'undefined' ? __attr["vatIdProp"] : undefined);
var courtLabelProp = (typeof __attr["courtLabel"] !== 'undefined') ? __attr["courtLabel"] : (typeof __attr["courtLabelProp"] !== 'undefined' ? __attr["courtLabelProp"] : undefined);
var courtNameProp = (typeof __attr["courtName"] !== 'undefined') ? __attr["courtName"] : (typeof __attr["courtNameProp"] !== 'undefined' ? __attr["courtNameProp"] : undefined);
var legalHeadingProp = (typeof __attr["legalHeading"] !== 'undefined') ? __attr["legalHeading"] : (typeof __attr["legalHeadingProp"] !== 'undefined' ? __attr["legalHeadingProp"] : undefined);
var businessPurposeLabelProp = (typeof __attr["businessPurposeLabel"] !== 'undefined') ? __attr["businessPurposeLabel"] : (typeof __attr["businessPurposeLabelProp"] !== 'undefined' ? __attr["businessPurposeLabelProp"] : undefined);
var businessPurposeProp = (typeof __attr["businessPurpose"] !== 'undefined') ? __attr["businessPurpose"] : (typeof __attr["businessPurposeProp"] !== 'undefined' ? __attr["businessPurposeProp"] : undefined);
var authorityLabelProp = (typeof __attr["authorityLabel"] !== 'undefined') ? __attr["authorityLabel"] : (typeof __attr["authorityLabelProp"] !== 'undefined' ? __attr["authorityLabelProp"] : undefined);
var authorityProp = (typeof __attr["authority"] !== 'undefined') ? __attr["authority"] : (typeof __attr["authorityProp"] !== 'undefined' ? __attr["authorityProp"] : undefined);
var trademarkLabelProp = (typeof __attr["trademarkLabel"] !== 'undefined') ? __attr["trademarkLabel"] : (typeof __attr["trademarkLabelProp"] !== 'undefined' ? __attr["trademarkLabelProp"] : undefined);
var trademarkProp = (typeof __attr["trademark"] !== 'undefined') ? __attr["trademark"] : (typeof __attr["trademarkProp"] !== 'undefined' ? __attr["trademarkProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

const editText = (
    value,
    key,
    className,
    tagName= 'span',
  ) =>
    setAttributes ? (
      createElement(wp.blockEditor.RichText, {
        tagName: tagName,
        value: (function(){ var __v = (value); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ [key]: val }),
        className: className
      })
    ) : tagName === 'div' ? (
      createElement("div", { className: className, dangerouslySetInnerHTML: { __html: value } })
    ) : tagName === 'p' ? (
      createElement("p", { className: className }, value)
    ) : tagName === 'h2' ? (
      createElement("h2", { className: className }, value)
    ) : tagName === 'h3' ? (
      createElement("h3", { className: className }, value)
    ) : (
      createElement("span", { className: className }, value)
    );

function useDual(prop, metaKey) {
  const meta = useWpMeta(metaKey, defaults[metaKey]);
  return prop ?? meta;
}


  const companyHeading = useDual(companyHeadingProp, 'company_heading');
  const companyName = useDual(companyNameProp, 'company_name');
  const companyLegalForm = useDual(companyLegalFormProp, 'company_legal_form');
  const addressHeading = useDual(addressHeadingProp, 'address_heading');
  const addressLine1 = useDual(addressLine1Prop, 'address_line_1');
  const addressLine2 = useDual(addressLine2Prop, 'address_line_2');
  const addressCountry = useDual(addressCountryProp, 'address_country');
  const contactHeading = useDual(contactHeadingProp, 'contact_heading');
  const contactEmail = useDual(contactEmailProp, 'contact_email');
  const contactWebsiteLabel = useDual(
    contactWebsiteLabelProp,
    'contact_website_label',
  );
  const contactWebsiteUrl = useDual(
    contactWebsiteUrlProp,
    'contact_website_url',
  );
  const contactWebsiteDisplay = useDual(
    contactWebsiteDisplayProp,
    'contact_website_display',
  );
  const registerHeading = useDual(registerHeadingProp, 'register_heading');
  const registerNumberLabel = useDual(
    registerNumberLabelProp,
    'register_number_label',
  );
  const registerNumber = useDual(registerNumberProp, 'register_number');
  const vatLabel = useDual(vatLabelProp, 'vat_label');
  const vatId = useDual(vatIdProp, 'vat_id');
  const courtLabel = useDual(courtLabelProp, 'court_label');
  const courtName = useDual(courtNameProp, 'court_name');
  const legalHeading = useDual(legalHeadingProp, 'legal_heading');
  const businessPurposeLabel = useDual(
    businessPurposeLabelProp,
    'business_purpose_label',
  );
  const businessPurpose = useDual(businessPurposeProp, 'business_purpose');
  const authorityLabel = useDual(authorityLabelProp, 'authority_label');
  const authority = useDual(authorityProp, 'authority');
  const trademarkLabel = useDual(trademarkLabelProp, 'trademark_label');
  const trademark = useDual(trademarkProp, 'trademark');

  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("div", { className: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${sectionPaddingY(paddingY)}` }, createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8" }, createElement("div", { className: "md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-6" }, createElement("div", null, [editText(
              companyHeading,
              'companyHeading',
              'text-xs font-mono font-bold uppercase tracking-widest text-[#929f5d] mb-2 block',
              'h2',
            ), editText(
              companyName,
              'companyName',
              'text-lg font-black text-slate-900 uppercase tracking-tight block',
              'p',
            ), editText(
              companyLegalForm,
              'companyLegalForm',
              'text-slate-500 text-sm mt-1 block',
              'p',
            )]), createElement("div", { className: "h-px bg-slate-100" }), createElement("div", { className: "flex gap-4" }, createElement("div", { className: "w-10 h-10 rounded-xl bg-[#929f5d]/10 flex items-center justify-center shrink-0 text-[#929f5d]" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4"}, createElement("path", {"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}), createElement("circle", {"cx":"12","cy":"10","r":"3"}))), createElement("div", null, [editText(
                addressHeading,
                'addressHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              ), editText(addressLine1, 'addressLine1', 'text-sm font-bold text-slate-800 block', 'p'), editText(addressLine2, 'addressLine2', 'text-sm font-bold text-slate-800 block', 'p'), editText(
                addressCountry,
                'addressCountry',
                'text-sm font-semibold text-slate-500 mt-0.5 block',
                'p',
              )])), createElement("div", { className: "h-px bg-slate-100" }), createElement("div", { className: "flex gap-4" }, createElement("div", { className: "w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4"}, createElement("rect", {"width":"20","height":"16","x":"2","y":"4","rx":"2"}), createElement("path", {"d":"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}))), createElement("div", null, editText(
                contactHeading,
                'contactHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              ), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.contactEmail); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ contactEmail: val }),
        className: "text-sm font-bold text-slate-800 block",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("a", { href: `mailto:${attributes.contactEmail}`, className: "text-sm font-bold text-slate-800 hover:text-primary transition-colors" }, attributes.contactEmail)), createElement("p", { className: "text-xs font-semibold text-slate-500 mt-1" }, setAttributes ? (createElement(wp.element.Fragment, null, createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.contactWebsiteLabel); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ contactWebsiteLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      }), ' ', createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.contactWebsiteDisplay); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ contactWebsiteDisplay: val }),
        className: "underline",
        disableLineBreaks: true,
        allowedFormats: []
      }))) : (createElement(wp.element.Fragment, null, [attributes.contactWebsiteLabel, ' '], createElement("a", { href: attributes.contactWebsiteUrl, target: "_blank", rel: "noopener noreferrer", className: "underline hover:text-primary" }, attributes.contactWebsiteDisplay)))))), createElement("div", { className: "h-px bg-slate-100" }), createElement("div", { className: "flex gap-4" }, createElement("div", { className: "w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-600" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4"}, createElement("line", {"x1":"3","x2":"21","y1":"22","y2":"22"}), createElement("line", {"x1":"6","x2":"6","y1":"18","y2":"11"}), createElement("line", {"x1":"10","x2":"10","y1":"18","y2":"11"}), createElement("line", {"x1":"14","x2":"14","y1":"18","y2":"11"}), createElement("line", {"x1":"18","x2":"18","y1":"18","y2":"11"}), createElement("polygon", {"points":"12 2 20 7 4 7"}))), createElement("div", { className: "space-y-2 w-full" }, editText(
                registerHeading,
                'registerHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              ), createElement("div", { className: "grid grid-cols-2 gap-4 text-xs font-bold text-slate-700" }, createElement("div", null, [editText(
                    registerNumberLabel,
                    'registerNumberLabel',
                    'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                    'span',
                  ), editText(registerNumber, 'registerNumber', 'block', 'span')]), createElement("div", null, [editText(
                    vatLabel,
                    'vatLabel',
                    'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                    'span',
                  ), editText(vatId, 'vatId', 'block', 'span')])), createElement("div", { className: "text-xs font-bold text-slate-700 pt-1" }, [editText(
                  courtLabel,
                  'courtLabel',
                  'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                  'span',
                ), editText(courtName, 'courtName', 'block', 'span')])))), createElement("div", { className: "bg-slate-100/60 rounded-2xl p-6 shadow-xs h-fit space-y-5" }, createElement("h2", { className: "text-sm font-black uppercase text-slate-800 pb-3 flex items-center gap-2" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 text-primary shrink-0"}, createElement("path", {"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}), createElement("path", {"d":"m9 12 2 2 4-4"})), editText(legalHeading, 'legalHeading', '', 'span')), createElement("div", { className: "space-y-4" }, createElement("div", null, editText(
                businessPurposeLabel,
                'businessPurposeLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              ), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.businessPurpose); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ businessPurpose: val }),
        className: "text-xs font-semibold text-slate-700 leading-relaxed"
      })) : (createElement("div", { className: "text-xs font-semibold text-slate-700 leading-relaxed", dangerouslySetInnerHTML: { __html: attributes.businessPurpose } }))), createElement("div", null, editText(
                authorityLabel,
                'authorityLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              ), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.authority); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ authority: val }),
        className: "text-xs font-semibold text-slate-700 leading-relaxed"
      })) : (createElement("div", { className: "text-xs font-semibold text-slate-700 leading-relaxed", dangerouslySetInnerHTML: { __html: attributes.authority } }))), createElement("div", null, editText(
                trademarkLabel,
                'trademarkLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              ), setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "div",
        value: (function(){ var __v = (attributes.trademark); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ trademark: val }),
        className: "text-xs font-semibold text-slate-700 leading-relaxed"
      })) : (createElement("div", { className: "text-xs font-semibold text-slate-700 leading-relaxed", dangerouslySetInnerHTML: { __html: attributes.trademark } })))))));
})()