import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '../.forgewp/wordpress';
import { editable as berUnsPageEditable, defaults } from '../../cms/editables/ber-uns-page';

export const editable = pickEditable(berUnsPageEditable, {
    badge: 'team_badge',
    title: 'team_title',
    subtitle: 'team_subtitle',
    team: 'team_members',
  });


export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string | { url?: string; id?: number; alt?: string };
}

export interface AboutTeamProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  team?: TeamMember[];
  setAttributes?: (attrs: Partial<AboutTeamProps>) => void;
}

function avatarUrl(avatar: TeamMember['avatar'] | undefined): string {
  if (!avatar) return '';
  if (typeof avatar === 'string') return avatar;
  return avatar.url || '';
}

/**
 * @forgewp-block
 * title: About Team
 * category: theme
 * icon: groups
 * description: Team member grid (About page section).
 */
export function AboutTeam({
  badge: badgeProp,
  title: titleProp,
  subtitle: subtitleProp,
  team: teamProp,
  setAttributes,
}: AboutTeamProps) {
  const badgeMeta = useWpMeta('team_badge', defaults.team_badge);
  const titleMeta = useWpMeta('team_title', defaults.team_title);
  const subtitleMeta = useWpMeta('team_subtitle', defaults.team_subtitle);
  const teamMeta = useWpMeta('team_members', defaults.team_members as TeamMember[]);

  const badge = badgeProp ?? badgeMeta;
  const title = titleProp ?? titleMeta;
  const subtitle = subtitleProp ?? subtitleMeta;
  const members: TeamMember[] = Array.isArray(teamProp)
    ? teamProp
    : Array.isArray(teamMeta)
      ? teamMeta
      : (defaults.team_members as TeamMember[]);

  return (
    <div className='bg-white w-full py-12 sm:py-16'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-10'>
          {setAttributes ? (
            <WpEditable
              tagName='span'
              value={badge}
              onChange={(val) => setAttributes({ badge: val })}
              className='text-xs font-semibold uppercase tracking-widest text-primary mb-2 block'
            />
          ) : (
            <span className='text-xs font-semibold uppercase tracking-widest text-primary mb-2 block'>
              {badge}
            </span>
          )}
          <h2 className='text-3xl sm:text-4xl font-black tracking-tight uppercase text-slate-900'>
            {setAttributes ? (
              <WpEditable tagName='span' value={title} onChange={(val) => setAttributes({ title: val })} />
            ) : (
              title
            )}
          </h2>
          {setAttributes ? (
            <WpEditable
              tagName='p'
              value={subtitle}
              onChange={(val) => setAttributes({ subtitle: val })}
              className='text-slate-400 text-sm mt-2 max-w-xl mx-auto'
            />
          ) : (
            <p className='text-slate-400 text-sm mt-2 max-w-xl mx-auto'>{subtitle}</p>
          )}
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {members.map((row, index) => (
            <div
              key={index}
              className='bg-slate-50/70 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white transition-all duration-300 group relative overflow-hidden flex flex-col items-center'
            >
              <div className='absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none' />

              <div className='w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 shadow-xs relative'>
                <img
                  src={avatarUrl(row.avatar)}
                  alt={row.name}
                  className='w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500'
                  loading='lazy'
                />
              </div>

              {setAttributes ? (
                <>
                  <WpEditable
                    tagName='h3'
                    value={row.name}
                    onChange={(val) =>
                      setAttributes({
                        team: members.map((r, i) => (i === index ? { ...r, name: val } : r)),
                      })
                    }
                    className='font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200'
                  />
                  <WpEditable
                    tagName='p'
                    value={row.role}
                    onChange={(val) =>
                      setAttributes({
                        team: members.map((r, i) => (i === index ? { ...r, role: val } : r)),
                      })
                    }
                    className='text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3'
                  />
                  <WpEditable
                    tagName='p'
                    value={row.bio}
                    onChange={(val) =>
                      setAttributes({
                        team: members.map((r, i) => (i === index ? { ...r, bio: val } : r)),
                      })
                    }
                    className='text-xs text-slate-500 leading-relaxed grow'
                  />
                </>
              ) : (
                <>
                  <h3 className='font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200'>
                    {row.name}
                  </h3>
                  <p className='text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3'>
                    {row.role}
                  </p>
                  <p className='text-xs text-slate-500 leading-relaxed grow'>{row.bio}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutTeam;
