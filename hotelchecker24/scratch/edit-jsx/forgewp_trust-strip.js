(() => {
const cell = (
    value,
    label,
    valueKey,
    labelKey,
  ) => (createElement("div", { className: "flex flex-col items-center gap-1" }, setAttributes ? (createElement(wp.element.Fragment, null, createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.value) || '',
        onChange: (val) => setAttributes({ [valueKey]: val }),
        className: "text-2xl font-black text-slate-900 font-sans",
        disableLineBreaks: true,
        allowedFormats: []
      }), createElement(wp.blockEditor.RichText, {
        tagName: "span",
        value: (attributes.label) || '',
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

  const stat1Value = setAttributes ? (v1p ?? v1m) : v1m;
  const stat1Label = setAttributes ? (l1p ?? l1m) : l1m;
  const stat2Value = setAttributes ? (v2p ?? v2m) : v2m;
  const stat2Label = setAttributes ? (l2p ?? l2m) : l2m;
  const stat3Value = setAttributes ? (v3p ?? v3m) : v3m;
  const stat3Label = setAttributes ? (l3p ?? l3m) : l3m;
  const stat4Value = setAttributes ? (v4p ?? v4m) : v4m;
  const stat4Label = setAttributes ? (l4p ?? l4m) : l4m;
  const paddingY = resolveBlockPaddingY(setAttributes, paddingYProp, BAKED_PADDING);

  
return createElement("div", { className: `bg-white w-full ${sectionPaddingY(attributes.paddingY)}` }, createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 text-center" }, `${cell(stat1Value, stat1Label, 'stat1Value', 'stat1Label')}
          ${cell(stat2Value, stat2Label, 'stat2Value', 'stat2Label')}
          ${cell(stat3Value, stat3Label, 'stat3Value', 'stat3Label')}
          ${cell(stat4Value, stat4Label, 'stat4Value', 'stat4Label')}`)));
})()