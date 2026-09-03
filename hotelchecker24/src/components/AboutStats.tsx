import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';

export const editable = pickEditable(berUnsPageEditable, {
    stats: 'stats',
  });


export interface StatItem {
  value: string;
  label: string;
}

export interface AboutStatsProps {
  stats?: StatItem[];
  setAttributes?: (attrs: Partial<AboutStatsProps>) => void;
}

/**
 * @forgewp-block
 * title: About Stats
 * category: theme
 * icon: chart-bar
 * description: Fixed key-metric stats row (About page section).
 */
export function AboutStats({
  stats: statsProp,
  setAttributes,
}: AboutStatsProps) {
  const statsMeta = useWpMeta('stats', defaults.stats as StatItem[]);
  const rows: StatItem[] = Array.isArray(statsProp)
    ? statsProp
    : Array.isArray(statsMeta)
      ? statsMeta
      : (defaults.stats as StatItem[]);

  return (
    <div className='bg-white w-full py-4 sm:py-6'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-6 text-center'>
          {rows.map((row, index) => (
            <div key={index} className='space-y-1'>
              {setAttributes ? (
                <>
                  <WpEditable
                    tagName='div'
                    value={row.value}
                    onChange={(val) =>
                      setAttributes({
                        stats: rows.map((r, i) => (i === index ? { ...r, value: val } : r)),
                      })
                    }
                    className='text-2xl font-black text-slate-900 tracking-tight'
                  />
                  <WpEditable
                    tagName='div'
                    value={row.label}
                    onChange={(val) =>
                      setAttributes({
                        stats: rows.map((r, i) => (i === index ? { ...r, label: val } : r)),
                      })
                    }
                    className='text-xs font-semibold text-slate-400'
                  />
                </>
              ) : (
                <>
                  <div className='text-2xl font-black text-slate-900 tracking-tight'>{row.value}</div>
                  <div className='text-xs font-semibold text-slate-400'>{row.label}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutStats;
