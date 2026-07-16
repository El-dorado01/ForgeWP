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

function FeaturedHotelsGrid() {
  const { __ } = useWpI18n();
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  const { posts: hotels, loading } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 3,
  });

  // In the block editor's preview, useWpQuery's stub can only ever return an empty
  // result — there's no real fetch to run. Without this, an empty result there would
  // render the "no hotels found" empty state, which reads as a broken block rather than
  // a preview limitation. On the real frontend this flag is never set, so genuinely-empty
  // results still show the real empty stateconst inEditor = useIsEditorPreview();
  const showSkeleton = loading || (inEditor && hotels.length === 0);

  return (
    <>
      {showSkeleton ? (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse'
            >
              <div className='h-60 bg-slate-100' />
              <div className='p-6 space-y-3'>
                <div className='h-3 bg-slate-100 rounded w-1/3' />
                <div className='h-5 bg-slate-100 rounded w-3/4' />
              </div>
            </div>
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className='relative overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-linear-to-br from-slate-50 via-white to-[#929f5d]/5 py-16 px-8 text-center'>
          {/* Decorative background blobs */}
          <div className='pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#929f5d]/8 blur-2xl' />
          <div className='pointer-events-none absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-blue-100/60 blur-2xl' />

          <div className='relative z-10 flex flex-col items-center gap-4'>
            {/* Animated icon stack */}
            <div className='relative w-20 h-20 flex items-center justify-center'>
              <div className='absolute inset-0 rounded-2xl bg-[#929f5d]/10 animate-pulse' />
              <div className='absolute inset-2 rounded-xl bg-[#929f5d]/15' />
              <Hotel className='w-8 h-8 text-[#929f5d] relative z-10' />
              <Sparkles className='absolute -top-1 -right-1 w-4 h-4 text-[#929f5d]/70 animate-bounce' />
            </div>

            {/* Bilingual label */}
            <span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-full'>
              {__('Empfohlen')}
            </span>

            <div>
              <h3 className='text-xl font-black uppercase tracking-tight text-slate-800 font-sans mt-1'>
                {__('Keine Hotels gefunden')}
              </h3>
              <p className='text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed'>
                {__('Derzeit sind keine empfohlenen Hotels verfügbar.')}
              </p>
            </div>

            {/* Divider dots */}
            <div className='flex items-center gap-1.5 my-1'>
              {[0,1,2].map(i => (
                <span key={i} className='w-1 h-1 rounded-full bg-slate-200' />
              ))}
            </div>

            <WpLink
              href={hotelsHref}
              className='inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-lg shadow-[#929f5d]/20'
            >
              {__('Alle Hotels entdecken')} <ArrowRight className='w-3.5 h-3.5' />
            </WpLink>
          </div>
        </div>
      ) : (
        <>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {hotels.map((hotel) => {
              const postAny = hotel;
              const rating = String(hotel.customFields?.rating || '4.8');
              const city = String(hotel.customFields?.city || hotel.customFields?.location || '');
              const categoryTerms = postAny._terms?.category || [];
              const categoryName = categoryTerms.length > 0 ? categoryTerms[0].name : __('Boutique');
              const imageUrl =
                typeof hotel.featuredImage === 'object' && hotel.featuredImage !== null
                  ? (hotel.featuredImage).url || ''
                  : String(hotel.featuredImage || '');

              return (
                <WpLink
                  key={hotel.id}
                  href={hotel.permalink || `/hotel/${hotel.id}`}
                  className='bg-white border border-slate-100/80 rounded-3xl overflow-hidden shadow-md shadow-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group block'
                >
                  <div className='relative h-60 w-full overflow-hidden'>
                    <img
                      src={imageUrl}
                      alt={hotel.title}
                      className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                      loading='lazy'
                    />
                    <div className='absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1'>
                      <MapPin className='w-3 h-3 text-primary' />
                      <span>{city}</span>
                    </div>
                  </div>
                  <div className='p-6'>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md'>
                        {categoryName}
                      </span>
                      <span className='text-xs font-bold text-slate-700 flex items-center gap-1'>
                        <Star className='w-3.5 h-3.5 text-accent fill-accent' />
                        {rating}
                      </span>
                    </div>
                    <h3 className='font-sans font-bold text-lg text-slate-800 group-hover:text-primary transition-colors leading-snug'>
                      {hotel.title}
                    </h3>
                    <p className='text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed'>
                      {hotel.excerpt}
                    </p>
                  </div>
                </WpLink>
              );
            })}
          </div>
          <div className='mt-8 text-center md:hidden'>
            <WpLink
              href={hotelsHref}
              className='inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary'
            >
              {__('Alle Hotels ansehen')} <ArrowRight className='w-3.5 h-3.5' />
            </WpLink>
          </div>
        </>
      )}
    </>
  );
}
// Dual-host prop aliases (block attributes → local names used in components)
var __attr = (typeof attributes === 'object' && attributes) ? attributes : {};
var badgeProp = (typeof __attr["badge"] !== 'undefined') ? __attr["badge"] : (typeof __attr["badgeProp"] !== 'undefined' ? __attr["badgeProp"] : undefined);
var headingProp = (typeof __attr["heading"] !== 'undefined') ? __attr["heading"] : (typeof __attr["headingProp"] !== 'undefined' ? __attr["headingProp"] : undefined);
var subtitleProp = (typeof __attr["subtitle"] !== 'undefined') ? __attr["subtitle"] : (typeof __attr["subtitleProp"] !== 'undefined' ? __attr["subtitleProp"] : undefined);
var linkProp = (typeof __attr["linkLabel"] !== 'undefined') ? __attr["linkLabel"] : (typeof __attr["linkProp"] !== 'undefined' ? __attr["linkProp"] : undefined);
var paddingYProp = (typeof __attr["paddingY"] !== 'undefined') ? __attr["paddingY"] : (typeof __attr["paddingYProp"] !== 'undefined' ? __attr["paddingYProp"] : undefined);


  const badgeMeta = useWpMeta('featured_badge', defaults.featured_badge);
  const headingMeta = useWpMeta('featured_heading', defaults.featured_heading);
  const subtitleMeta = useWpMeta('featured_subtitle', defaults.featured_subtitle);
  const linkMeta = useWpMeta('featured_link_label', defaults.featured_link_label);

  const badge = badgeProp ?? badgeMeta;
  const heading = headingProp ?? headingMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const linkLabel = linkProp ?? linkMeta;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  const hotelsHref = useWpPageLink('hotels-page', '/hotels');

  
return createElement("section", { className: `w-full ${sectionPaddingY(paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "flex items-end justify-between mb-10" }, createElement("div", null, createElement("span", { className: "text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.badge); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ badge: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (badge)), createElement("h2", { className: "text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
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
        className: "text-slate-500 text-sm mt-1 max-w-md",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (createElement("p", { className: "text-slate-500 text-sm mt-1 max-w-md" }, attributes.subtitle))), createElement(WpLink, { href: hotelsHref, className: "hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors" }, setAttributes ? (createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (function(){ var __v = (attributes.linkLabel); if (__v == null) return ''; return (typeof __v === 'string' ? __v : String(__v)); })(),
        onChange: (val) => setAttributes({ linkLabel: val }),
        className: "",
        disableLineBreaks: true,
        allowedFormats: []
      })) : (linkLabel), createElement("svg", {"xmlns":"http://www.w3.org/2000/svg","width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2","strokeLinecap":"round","strokeLinejoin":"round","className":"w-3.5 h-3.5"}, createElement("path", {"d":"M5 12h14"}), createElement("path", {"d":"m12 5 7 7-7 7"})))), createElement("div", { className: "forgewp-editor-island-placeholder", style: {padding:'14px 16px',border:'1px dashed #c3c4c7',borderRadius:'8px',background:'#f6f7f7',color:'#646970',fontSize:'12px',lineHeight:'1.55'} }, createElement("strong", { style: {display:'block',marginBottom:'6px',color:'#1d2327',fontSize:'13px'} }, "FeaturedHotelsGrid - interactive preview"), createElement("span", { style: {display:'block'} }, "This section loads live data (hotels, terms, posts) on the visitor page. Edit headings and labels in the block sidebar under Block Settings, or use any inline fields shown on the canvas above this box. The live grid/list appears on the frontend after save."))));
})()