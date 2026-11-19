import { Award, Shield, Globe, Users, Star, type LucideIcon } from 'lucide-react';
import { pickEditable, WpEditable, WpIcon } from '@forgewp/react';
import { useWpMeta } from '@forgewp/react';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';

export const editable = pickEditable(berUnsPageEditable, {
    values: 'values',
  });


const VALUE_ICONS: Record<string, LucideIcon> = {
  award: Award,
  shield: Shield,
  globe: Globe,
  users: Users,
  star: Star,
};

function ValueIcon({ name, className }: { name?: string; className?: string }) {
  const slug = (name || 'award').toLowerCase();
  const Static = VALUE_ICONS[slug];
  if (Static) return <Static className={className} aria-hidden />;
  return <WpIcon name={slug} className={className} provider='lucide' />;
}

export interface ValueItem {
  icon?: string;
  title?: string;
  description?: string;
  color?: string;
}

export interface AboutValuesProps {
  values?: ValueItem[];
  setAttributes?: (attrs: Partial<AboutValuesProps>) => void;
}

/**
 * @forgewp-block
 * title: About Values
 * category: theme
 * icon: star-filled
 * description: Value cards grid (About page section).
 */
export function AboutValues({
  values: valuesProp,
  setAttributes,
}: AboutValuesProps) {
  const valuesMeta = useWpMeta('values', defaults.values as ValueItem[]);
  const rows: ValueItem[] = Array.isArray(valuesProp)
    ? valuesProp
    : Array.isArray(valuesMeta)
      ? valuesMeta
      : (defaults.values as ValueItem[]);

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0'>
      {rows.map((row, index) => (
        <div
          key={index}
          className='bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow'
        >
          <div
            className={
              'w-10 h-10 rounded-xl flex items-center justify-center mb-3 ' +
              (row.color?.replace(/\bborder[^\s]*/g, '').trim() ||
                'text-primary bg-primary/10')
            }
          >
            <ValueIcon name={row.icon} className='w-5 h-5' />
          </div>
          {setAttributes ? (
            <>
              <WpEditable
                tagName='h3'
                value={row.title || ''}
                onChange={(val) =>
                  setAttributes({
                    values: rows.map((r, i) => (i === index ? { ...r, title: val } : r)),
                  })
                }
                className='text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug'
              />
              <WpEditable
                tagName='p'
                value={row.description || ''}
                onChange={(val) =>
                  setAttributes({
                    values: rows.map((r, i) => (i === index ? { ...r, description: val } : r)),
                  })
                }
                className='text-xs sm:text-sm text-slate-500 leading-relaxed'
              />
            </>
          ) : (
            <>
              <h3 className='text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug'>
                {row.title}
              </h3>
              <p className='text-xs sm:text-sm text-slate-500 leading-relaxed'>{row.description}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default AboutValues;
