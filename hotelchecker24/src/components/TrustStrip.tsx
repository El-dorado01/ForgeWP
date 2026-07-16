import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '../.forgewp/wordpress';
import { editable as frontPageEditable, defaults } from '../../cms/editables/front-page';

/** Page content from ACF + block-only layout (padding never on page ACF). */
export const editable = pickEditable(frontPageEditable, {
    stat1Value: 'trust_stat1_value',
    stat1Label: 'trust_stat1_label',
    stat2Value: 'trust_stat2_value',
    stat2Label: 'trust_stat2_label',
    stat3Value: 'trust_stat3_value',
    stat3Label: 'trust_stat3_label',
    stat4Value: 'trust_stat4_value',
    stat4Label: 'trust_stat4_label',
  });


export interface TrustStripProps {
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
  setAttributes?: (attrs: Partial<TrustStripProps>) => void;
}

/**
 * @forgewp-block
 * title: Trust Strip
 * category: theme
 * icon: admin-users
 * description: Site statistics and trust metrics.
 */
export function TrustStrip({
  stat1Value: v1p,
  stat1Label: l1p,
  stat2Value: v2p,
  stat2Label: l2p,
  stat3Value: v3p,
  stat3Label: l3p,
  stat4Value: v4p,
  stat4Label: l4p,
  setAttributes,
}: TrustStripProps) {
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

  const cell = (
    value: string,
    label: string,
    valueKey: keyof TrustStripProps,
    labelKey: keyof TrustStripProps,
  ) => (
    <div className='flex flex-col items-center gap-1'>
      {setAttributes ? (
        <>
          <WpEditable
            tagName='span'
            value={value}
            onChange={(val) => setAttributes({ [valueKey]: val } as Partial<TrustStripProps>)}
            className='text-2xl font-black text-slate-900 font-sans'
          />
          <WpEditable
            tagName='span'
            value={label}
            onChange={(val) => setAttributes({ [labelKey]: val } as Partial<TrustStripProps>)}
            className='text-[10px] font-bold uppercase tracking-wider text-slate-400'
          />
        </>
      ) : (
        <>
          <span className='text-2xl font-black text-slate-900 font-sans'>{value}</span>
          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-400'>{label}</span>
        </>
      )}
    </div>
  );

  return (
    <div className='bg-white w-full py-4 sm:py-6'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
          {cell(stat1Value, stat1Label, 'stat1Value', 'stat1Label')}
          {cell(stat2Value, stat2Label, 'stat2Value', 'stat2Label')}
          {cell(stat3Value, stat3Label, 'stat3Value', 'stat3Label')}
          {cell(stat4Value, stat4Label, 'stat4Value', 'stat4Label')}
        </div>
      </div>
    </div>
  );
}

export default TrustStrip;
