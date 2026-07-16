(() => {
var defaults = {"hero_title":"Handverlesene","hero_title_colored":"Boutique- & Luxushotels","hero_subtitle":"Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.","hero_search_placeholder":"Hotelname oder Stadt suchen...","trust_stat1_value":"500+","trust_stat1_label":"Kuratierte Hotels","trust_stat2_value":"4","trust_stat2_label":"Länder abgedeckt","trust_stat3_value":"100%","trust_stat3_label":"Unabhängig & redaktionell","trust_stat4_value":"DE / EN","trust_stat4_label":"Deutsch & Englisch","featured_badge":"Empfohlen","featured_heading":"Ausgewählte Hotels","featured_subtitle":"Von unserer Redaktion handverlesen — außergewöhnliche Aufenthalte in ganz Europa.","featured_link_label":"Alle Hotels","editorial_badge":"Redaktionell & Unabhängig","editorial_heading":"Kuratiert von","editorial_heading_colored":"echten Reisenden","editorial_description":"Kein bezahltes Ranking. Kein Algorithmus. Nur ehrliche, redaktionell geprüfte Empfehlungen von unserem Team, das die Hotels selbst besucht hat.","editorial_cta_label":"Alle Hotelvergleiche lesen","editorial_feature1_label":"Vor-Ort-Besuche","editorial_feature1_desc":"Jedes Hotel wird persönlich getestet","editorial_feature2_label":"Keine Werbung","editorial_feature2_desc":"Vollständig redaktionell unabhängig","editorial_feature3_label":"DE & EN","editorial_feature3_desc":"Inhalte auf Deutsch und Englisch","editorial_feature4_label":"Laufend aktuell","editorial_feature4_desc":"Regelmäßige neue Empfehlungen","listicles_badge":"Magazin","listicles_heading":"Aktuelle Hotelvergleiche","listicles_subtitle":"Tiefgehende Reiseberichte und Empfehlungen von unserer Redaktion.","listicles_link_label":"Alle Vergleiche","destinations_heading":"Nach Reiseziel entdecken","destinations_subtitle":"Handverlesene Hotels in den schönsten Reisezielen Europas."};
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

function Button() { return undefined; }
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var titleProp = (typeof __attr["title"] !== 'undefined') ? __attr["title"] : (typeof __attr["titleProp"] !== 'undefined' ? __attr["titleProp"] : undefined);
var titleColoredProp = (typeof __attr["titleColored"] !== 'undefined') ? __attr["titleColored"] : (typeof __attr["titleColoredProp"] !== 'undefined' ? __attr["titleColoredProp"] : undefined);
var subtitleProp = (typeof __attr["subtitle"] !== 'undefined') ? __attr["subtitle"] : (typeof __attr["subtitleProp"] !== 'undefined' ? __attr["subtitleProp"] : undefined);
var searchPlaceholderProp = (typeof __attr["searchPlaceholder"] !== 'undefined') ? __attr["searchPlaceholder"] : (typeof __attr["searchPlaceholderProp"] !== 'undefined' ? __attr["searchPlaceholderProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);

function handleClickOutside(event) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target)
      ) {
        setCategoryOpen(false);
      }
      if (
        countryRef.current &&
        !countryRef.current.contains(event.target)
      ) {
        setCountryOpen(false);
      }
    }


  const titleMeta = useWpMeta('hero_title', defaults.hero_title);
  const titleColoredMeta = useWpMeta('hero_title_colored', defaults.hero_title_colored);
  const subtitleMeta = useWpMeta('hero_subtitle', defaults.hero_subtitle);
  const searchPlaceholderMeta = useWpMeta(
    'hero_search_placeholder',
    defaults.hero_search_placeholder,
  );

  const title = titleProp ?? titleMeta;
  const titleColored = titleColoredProp ?? titleColoredMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const searchPlaceholder = searchPlaceholderProp ?? searchPlaceholderMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const { __ } = useWpI18n();
  const [, setLocation] = useWpLocation();
  const hotelsPath = useWpPagePath('hotels-page', '/hotels');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState('');

  // Dynamically resolve the spotlight hotel ID set globally in site options
  const hotelOfTheMonthId = useWpOption('hotel_of_the_month', '6'); // default to ID 6 (Villa d'Este)

  let spotlightId = 6;
  const rawId = hotelOfTheMonthId;
  if (typeof rawId === 'string' && rawId.trim()) {
    try {
      const parsed = JSON.parse(rawId);
      if (Array.isArray(parsed)) {
        const firstVal = parsed[0];
        spotlightId = typeof firstVal === 'object' && firstVal !== null ? (firstVal.ID || firstVal.id) : firstVal;
      } else if (typeof parsed === 'object' && parsed !== null) {
        spotlightId = parsed.ID || parsed.id || spotlightId;
      } else {
        spotlightId = Number(parsed) || spotlightId;
      }
    } catch {
      spotlightId = Number(rawId) || spotlightId;
    }
    if (String(spotlightId).includes(',')) {
      spotlightId = Number(String(spotlightId).split(',')[0].trim()) || 6;
    }
  }

  const { posts: hotels, loading } = useWpQuery({
    postType: 'hotel',
    p: Number(spotlightId) || 6,
  });

  const spotlight = hotels && hotels.length > 0 ? hotels[0] : null;

  const spotlightTitle = spotlight ? spotlight.title : "Villa d'Este";
  const spotlightRating = spotlight ? String(spotlight.customFields?.rating || '4.9') : '4.9';
  const spotlightCity = spotlight ? String(spotlight.customFields?.city || spotlight.customFields?.location || '') : 'Comer See';
  const spotlightCountry = spotlight ? (spotlight)._terms?.country?.[0]?.name || 'Italien' : 'Italien';
  const spotlightImage = spotlight ? (typeof spotlight.featuredImage === 'object' && spotlight.featuredImage !== null ? (spotlight.featuredImage).url : String(spotlight.featuredImage)) : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';
  const spotlightLink = spotlight ? (spotlight.permalink || `/hotel/${spotlight.id}`) : '#';

  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [countryOpen, setCountryOpen] = React.useState(false);

  const categoryRef = React.useRef(null);
  const countryRef = React.useRef(null);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load taxonomy terms dynamically from WP REST API (or mock data in dev)
  const { terms: categoryTerms } = useWpTerms('category');
  const { terms: countryTerms } = useWpTerms('country');

  // Build dropdown options — always include an "all" entry first
  const categories = [
    { value: '', label: __('Kategorie (Alle)') },
    ...categoryTerms.map((t) => ({ value: t.slug, label: t.name })),
  ];
  const countries = [
    { value: '', label: __('Land (Alle)') },
    ...countryTerms.map((t) => ({
      value: t.slug,
      label: `${t.meta?.flag ?? '🌍'} ${t.name}`,
    })),
  ];

  const isSearchDisabled =
    !searchTerm.trim() && !selectedCategory && !selectedCountry;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (isSearchDisabled) return;
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('q', searchTerm.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedCountry) params.append('country', selectedCountry);
    setLocation(`${hotelsPath}?${params.toString()}`);
  };

  
return createElement("section", { className: `relative w-full overflow-hidden bg-slate-50 selection:bg-primary selection:text-white ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "absolute top-0 right-0 w-150 h-150 bg-[radial-gradient(circle,rgba(109,155,174,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" }), createElement("div", { className: "absolute bottom-0 left-0 w-125 h-125 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" }), createElement("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10" }, createElement("div", { className: "lg:col-span-7 flex flex-col items-start text-left" }, createElement("h1", { className: "text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-slate-800 leading-[1.1] mb-6 uppercase" }, createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.title); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ title: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement("br", null), createElement("span", { className: "bg-linear-to-r from-primary via-slate-700 to-accent bg-clip-text text-transparent" }, createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.titleColored); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ titleColored: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      }))), createElement(wp.blockEditor.RichText, {
        tagName: "p",
        value: (function(){ var __v = (attributes.subtitle); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ subtitle: val }),
        className: "text-slate-500 text-base sm:text-lg max-w-2xl mb-10 font-sans font-normal leading-relaxed",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement("form", { onSubmit: handleSearchSubmit, className: "w-full bg-white border border-slate-100/95 shadow-xl shadow-slate-200/30 p-2 rounded-3xl sm:rounded-full grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-center mb-8" }, createElement("div", { className: "sm:col-span-5 relative flex items-center h-12 px-4 border border-slate-100 sm:border-0 sm:border-r sm:border-slate-100 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus-within:border-primary/60 sm:focus-within:border-transparent transition-colors" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 text-slate-400 shrink-0 mr-3"}, createElement("circle", {"cx":"11","cy":"11","r":"8"}), createElement("path", {"d":"m21 21-4.3-4.3"})), createElement("input", { type: "text", placeholder: attributes.searchPlaceholder, value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full h-full text-slate-800 text-sm font-medium bg-transparent focus:outline-none placeholder-slate-400" })), createElement("div", { className: "sm:col-span-3 relative", ref: categoryRef }, createElement("button", { type: "button", onClick: () => {
                  setCategoryOpen(!categoryOpen);
                  setCountryOpen(false);
                }, className: "w-full flex items-center justify-between h-12 px-4 border border-slate-100 sm:border-0 sm:border-r sm:border-slate-100 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus:outline-none focus:border-primary/60 sm:focus:border-transparent transition-colors text-slate-700 text-xs font-bold bg-transparent cursor-pointer" }, createElement("div", { className: "flex items-center gap-2" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5 text-slate-400 shrink-0"}, createElement("polygon", {"points":"3 11 22 2 13 21 11 13 3 11"})), createElement("span", { className: "whitespace-nowrap overflow-hidden text-ellipsis max-w-25 sm:max-w-none" }, selectedCategory
                      ? categories.find((c) => c.value === selectedCategory)
                          ?.label
                      : __('Kategorie (Alle)'))), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`"}, createElement("path", {"d":"m6 9 6 6 6-6"}))), categoryOpen && (createElement("div", { className: "absolute left-0 mt-2 w-48 bg-white border border-slate-100/90 rounded-2xl shadow-xl p-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150" }, categories.map((c) => (createElement("button", { key: c.value, type: "button", onClick: () => {
                        setSelectedCategory(c.value);
                        setCategoryOpen(false);
                      }, className: "w-full text-left text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-primary rounded-xl cursor-pointer p-2.5 transition-colors focus:bg-slate-50 focus:text-primary outline-none block" }, c.label)))))), createElement("div", { className: "sm:col-span-2 relative", ref: countryRef }, createElement("button", { type: "button", onClick: () => {
                  setCountryOpen(!countryOpen);
                  setCategoryOpen(false);
                }, className: "w-full flex items-center justify-between h-12 px-4 border border-slate-100 sm:border-0 rounded-2xl sm:rounded-none hover:border-slate-200 sm:hover:border-transparent focus:outline-none focus:border-primary/60 sm:focus:border-transparent transition-colors text-slate-700 text-xs font-bold bg-transparent cursor-pointer" }, createElement("div", { className: "flex items-center gap-2" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5 text-slate-400 shrink-0"}, createElement("path", {"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}), createElement("circle", {"cx":"12","cy":"10","r":"3"})), createElement("span", { className: "whitespace-nowrap overflow-hidden text-ellipsis max-w-17.5 sm:max-w-none" }, selectedCountry
                      ? (() => {
                          const found = countries.find(
                            (c) => c.value === selectedCountry,
                          );
                          if (!found) return __('Land');
                          const parts = found.label.split(' ');
                          return parts.length > 1
                            ? parts.slice(1).join(' ')
                            : found.label;
                        })()
                      : __('Land'))), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${countryOpen ? 'rotate-180' : ''}`"}, createElement("path", {"d":"m6 9 6 6 6-6"}))), countryOpen && (createElement("div", { className: "absolute left-0 mt-2 w-40 bg-white border border-slate-100/90 rounded-2xl shadow-xl p-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150" }, countries.map((c) => (createElement("button", { key: c.value, type: "button", onClick: () => {
                        setSelectedCountry(c.value);
                        setCountryOpen(false);
                      }, className: "w-full text-left text-slate-700 text-xs font-semibold hover:bg-slate-50 hover:text-primary rounded-xl cursor-pointer p-2.5 transition-colors focus:bg-slate-50 focus:text-primary outline-none block" }, c.label)))))), createElement("div", { className: "sm:col-span-2 px-1" }, createElement("Button", { type: "submit", disabled: isSearchDisabled, className: "w-full h-12 bg-primary hover:bg-primary/95 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-2xl sm:rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all duration-300 transform active:scale-95 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none" }, createElement("span", null, __('Suchen')), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-4 h-4 text-white group-hover:text-white transition-all duration-300 group-hover:translate-x-1"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"}))))), createElement("div", { className: "flex flex-wrap items-center justify-center w-full gap-2" }, createElement("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-400 mr-2" }, __('Trending:')), (categoryTerms.length > 0
              ? categoryTerms.slice(0, 5).map((t) => t.name)
              : [__('Wellness'), __('Boutique'), __('Alpin'), __('Luxus'), __('Design')]
            ).map((tag) => (createElement("button", { key: tag, type: "button", onClick: () => {
                  const term = categoryTerms.find(
                    (t) => t.name === tag || t.slug === tag.toLowerCase(),
                  );
                  setSelectedCategory(term ? term.slug : tag.toLowerCase());
                }, className: "text-xs font-semibold text-slate-500 hover:text-primary hover:border-primary/40 border border-slate-200 bg-white py-1.5 px-3.5 rounded-full cursor-pointer transition-all duration-300" }, `#${tag}`))))), loading ? (createElement("div", { className: "lg:col-span-5 flex items-center justify-center relative w-full mt-8 lg:mt-0 animate-pulse" }, createElement("div", { className: "relative w-full aspect-4/5 sm:max-w-md lg:max-w-none rounded-[40px] bg-slate-200 border border-slate-200/60 shadow-2xl overflow-hidden" }, createElement("div", { className: "absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-xl flex items-center justify-between" }, createElement("div", { className: "flex-1 pr-4" }, createElement("div", { className: "h-3 bg-[#929f5d]/20 rounded-md w-24 mb-2" }), createElement("div", { className: "h-5 bg-slate-300 rounded-md w-3/4 mb-2" }), createElement("div", { className: "h-3 bg-slate-300 rounded-md w-1/2" })), createElement("div", { className: "flex flex-col items-end shrink-0 w-16" }, createElement("div", { className: "h-6 bg-slate-300 rounded-md w-12 mb-1.5" }), createElement("div", { className: "h-2.5 bg-slate-300 rounded-md w-10" })))))) : (createElement("WpLink", { href: spotlightLink, className: "lg:col-span-5 flex items-center justify-center relative w-full mt-8 lg:mt-0 cursor-pointer group" }, createElement("div", { className: "relative w-full aspect-4/5 sm:max-w-md lg:max-w-none rounded-[40px] overflow-hidden border border-slate-200/60 shadow-2xl" }, createElement("img", { src: spotlightImage, alt: spotlightTitle, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" }), createElement("div", { className: "absolute inset-0 bg-linear-to-t from-slate-900/65 via-slate-900/10 to-transparent pointer-events-none" }), createElement("div", { className: "absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-xl flex items-center justify-between transition-all duration-300 group-hover:bg-white" }, createElement("div", null, createElement("span", { className: "text-[10px] font-bold uppercase tracking-wider text-[#929f5d] bg-[#929f5d]/10 px-2.5 py-0.5 rounded-md mb-1.5 inline-block" }, __('Hotel des Monats')), createElement("h4", { className: "font-sans font-black text-slate-800 text-lg leading-tight" }, spotlightTitle), createElement("p", { className: "text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-0.5" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5 text-primary"}, createElement("path", {"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}), createElement("circle", {"cx":"12","cy":"10","r":"3"})), [spotlightCity, spotlightCountry ? `, ${spotlightCountry}` : ''])), createElement("div", { className: "flex flex-col items-end shrink-0" }, createElement("span", { className: "text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-xs" }, createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5 text-accent fill-accent"}, createElement("path", {"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"})), spotlightRating), createElement("span", { className: "text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider" }, __('Hervorragend')))))))));
})()