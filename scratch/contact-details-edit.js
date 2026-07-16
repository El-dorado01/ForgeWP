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
// Icon component stubs (lucide etc. → forgeWpRenderIcon)
var Mail = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("mail", p && (p.className || p.class) || '', 'lucide') : null; };
var Phone = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("phone", p && (p.className || p.class) || '', 'lucide') : null; };
var MapPin = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("map-pin", p && (p.className || p.class) || '', 'lucide') : null; };
var Clock = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("clock", p && (p.className || p.class) || '', 'lucide') : null; };
var Globe = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("globe", p && (p.className || p.class) || '', 'lucide') : null; };
var Instagram = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("instagram", p && (p.className || p.class) || '', 'lucide') : null; };
var Facebook = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("facebook", p && (p.className || p.class) || '', 'lucide') : null; };
var Twitter = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("twitter", p && (p.className || p.class) || '', 'lucide') : null; };
var Youtube = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("youtube", p && (p.className || p.class) || '', 'lucide') : null; };
var Linkedin = function(p) { return (typeof forgeWpRenderIcon === 'function') ? forgeWpRenderIcon("linkedin", p && (p.className || p.class) || '', 'lucide') : null; };
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var detailsHeadingProp = (typeof __attr["detailsHeading"] !== 'undefined') ? __attr["detailsHeading"] : (typeof __attr["detailsHeadingProp"] !== 'undefined' ? __attr["detailsHeadingProp"] : undefined);
var socialHeadingProp = (typeof __attr["socialHeading"] !== 'undefined') ? __attr["socialHeading"] : (typeof __attr["socialHeadingProp"] !== 'undefined' ? __attr["socialHeadingProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

const getSocialHandle = (url, defaultHandle) => {
    if (!url) return defaultHandle;
    try {
      const parts = url.replace(/\/$/, '').split('/');
      return parts.length > 0 ? parts[parts.length - 1] : defaultHandle;
    } catch {
      return defaultHandle;
    }
  };

const TiktokIcon = (props) => (createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: props.className }, createElement("path", { d: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .57.04.84.13V9.25a6.29 6.29 0 0 0-1.84-.27A6.3 6.3 0 0 0 2 15.28a6.3 6.3 0 0 0 10.3 4.84V8a8.29 8.29 0 0 0 5.3 1.9v-3.2a4.81 4.81 0 0 1 1.99-.01z" })));

const PinterestIcon = (props) => (createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: props.className }, createElement("path", { d: "M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.16-.1-.95-.2-2.4 0-3.43l1.24-5.27s-.32-.64-.32-1.57c0-1.48.86-2.58 1.92-2.58.9 0 1.34.68 1.34 1.5 0 .9-.58 2.27-.88 3.53-.25 1.06.53 1.92 1.58 1.92 1.9 0 3.36-2 3.36-4.88 0-2.55-1.83-4.33-4.44-4.33-3.03 0-4.8 2.27-4.8 4.6 0 .92.35 1.9.8 2.44.09.1.1.18.07.3l-.3 1.22c-.05.2-.16.24-.37.14C4.85 16.48 4 13.9 4 11.42c0-4.07 2.96-7.8 8.52-7.8 4.47 0 7.95 3.19 7.95 7.45 0 4.44-2.8 8.02-6.7 8.02-1.3 0-2.53-.68-2.95-1.48l-.8 3.05c-.29 1.1-.1 2.47-.02 2.62.94.29 1.93.44 2.97.44 6.63 0 12-5.37 12-12S18.63 0 12 0z" })));


  const { __ } = useWpI18n();
  const phone = useWpOption('contact_phone', '+43 1 234 5678');
  const email = useWpOption('contact_email', 'office@max-online.at');
  const address = useWpOption(
    'contact_address',
    'Coronablick 7, A-3652 Leiben, Österreich',
  );
  const hours = useWpOption('business_hours', 'Mo–Fr 09:00–18:00 Uhr');

  const facebookUrl = useWpOption('social_facebook', '');
  const instagramUrl = useWpOption('social_instagram', '');
  const twitterUrl = useWpOption('social_twitter', '');
  const youtubeUrl = useWpOption('social_youtube', '');
  const tiktokUrl = useWpOption('social_tiktok', '');
  const linkedinUrl = useWpOption('social_linkedin', '');
  const pinterestUrl = useWpOption('social_pinterest', '');
  const siteUrl = useWpOption('siteurl', 'https://hotelchecker24.com');

  const detailsHeadingMeta = useWpMeta(
    'details_heading',
    defaults.details_heading,
  );
  const socialHeadingMeta = useWpMeta(
    'social_heading',
    defaults.social_heading,
  );
  const detailsHeading = detailsHeadingProp ?? detailsHeadingMeta;
  const socialHeading = socialHeadingProp ?? socialHeadingMeta;
  const paddingY = resolveBlockPaddingY(
    setAttributes,
    paddingYProp,
    BAKED_PADDING,
  );

  const socialList = [
    {
      icon: Instagram,
      label: 'Instagram',
      handle: instagramUrl
        ? `@${getSocialHandle(instagramUrl, 'hotelchecker24')}`
        : '',
      href: instagramUrl,
    },
    {
      icon: Facebook,
      label: 'Facebook',
      handle: facebookUrl
        ? getSocialHandle(facebookUrl, 'Hotelchecker24')
        : '',
      href: facebookUrl,
    },
    {
      icon: Twitter,
      label: 'Twitter / X',
      handle: twitterUrl
        ? `@${getSocialHandle(twitterUrl, 'hotelchecker24')}`
        : '',
      href: twitterUrl,
    },
    {
      icon: Youtube,
      label: 'YouTube',
      handle: youtubeUrl ? getSocialHandle(youtubeUrl, 'Hotelchecker24') : '',
      href: youtubeUrl,
    },
    {
      icon: TiktokIcon,
      label: 'TikTok',
      handle: tiktokUrl
        ? `@${getSocialHandle(tiktokUrl, 'hotelchecker24')}`
        : '',
      href: tiktokUrl,
    },
    {
      icon: Linkedin,
      label: 'LinkedIn',
      handle: linkedinUrl
        ? getSocialHandle(linkedinUrl, 'Hotelchecker24')
        : '',
      href: linkedinUrl,
    },
    {
      icon: PinterestIcon,
      label: 'Pinterest',
      handle: pinterestUrl
        ? getSocialHandle(pinterestUrl, 'Hotelchecker24')
        : '',
      href: pinterestUrl,
    },
    {
      icon: Globe,
      label: 'Website',
      handle: siteUrl
        ? siteUrl.replace(/^https?:\/\/(www\.)?/, '')
        : 'hotelchecker24.com',
      href: siteUrl,
    },
  ].filter((s) => s.href && s.href.trim() !== '');

  const pad = sectionPaddingY(attributes.paddingY);

  
return createElement("aside", { className: `space-y-5 w-full min-w-0 ${pad}`.trim() }, createElement("div", { className: "bg-white rounded-2xl p-6 shadow-xs space-y-5" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "h2",
        value: (function(){ var __v = (attributes.detailsHeading); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ detailsHeading: val }),
        className: "text-sm font-bold text-slate-600 pb-3",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("h2", { className: "text-sm font-bold text-slate-600 pb-3" }, attributes.detailsHeading)), (
          [
            {
              icon: Phone,
              label: 'Telefon',
              value: phone,
              href: `tel:${phone}`,
              color: 'text-primary bg-primary/10',
            },
            {
              icon: Mail,
              label: 'E-Mail',
              value: email,
              href: `mailto:${email}`,
              color: 'text-blue-600 bg-blue-50',
            },
            {
              icon: MapPin,
              label: 'Adresse',
              value: address,
              href: undefined,
              color: 'text-[#929f5d] bg-[#929f5d]/10',
            },
            {
              icon: Clock,
              label: 'Öffnungszeiten',
              value: hours,
              href: undefined,
              color: 'text-amber-600 bg-amber-50',
            },
          ]).map(({ icon: Icon, label, value, href, color }) => (createElement("div", { key: label, className: "flex items-start gap-4" }, createElement("div", { className: `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}` }, createElement(Icon, { className: "w-4 h-4" })), createElement("div", { className: "min-w-0" }, createElement("div", { className: "text-xs font-semibold text-slate-500 mb-0.5" }, __(label)), href ? (createElement("a", { href: href, className: "text-sm font-bold text-slate-800 hover:text-primary transition-colors break-all" }, value)) : (createElement("p", { className: "text-sm font-bold text-slate-800 leading-snug" }, value))))))), socialList.length > 0 && (createElement("div", { className: "bg-white rounded-2xl p-6 shadow-xs" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "h2",
        value: (function(){ var __v = (attributes.socialHeading); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ socialHeading: val }),
        className: "text-xs font-mono font-black uppercase tracking-widest text-slate-400 pb-3 mb-4",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("h2", { className: "text-xs font-mono font-black uppercase tracking-widest text-slate-400 pb-3 mb-4" }, attributes.socialHeading)), createElement("div", { className: "space-y-2" }, socialList.map(({ icon: Icon, label, handle, href }) => (createElement("a", { key: label, href: href, target: "_blank", rel: "noopener noreferrer", className: "flex items-center justify-between p-3 rounded-xl transition-all duration-300 group hover:shadow-xs hover:bg-slate-50" }, createElement("div", { className: "flex items-center gap-3" }, createElement("div", { className: "w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-primary transition-all" }, createElement(Icon, { className: "w-3.5 h-3.5 text-slate-500 group-hover:text-white" })), createElement("div", null, createElement("div", { className: "text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400" }, label), createElement("div", { className: "text-xs font-bold text-slate-800" }, handle))), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))))))));
})()