import {
  stripTypeScriptSyntax,
  jsHelperToPhpFunction,
  extractTopLevelHelper,
  extractSameFileHelpers,
} from '../packages/compiler/lib/blocks/source-sanitize.js';

const src = `
interface TeamMember {
  avatar: string | { url?: string };
}

function avatarUrl(avatar: TeamMember['avatar'] | undefined): string {
  if (!avatar) return '';
  if (typeof avatar === 'string') return avatar;
  return avatar.url || '';
}

export function AboutTeam() {
  return <img src={avatarUrl(row.avatar)} />;
}
`;

const extracted = extractTopLevelHelper(src, 'avatarUrl');
console.log('EXTRACTED:\n', extracted);
const stripped = stripTypeScriptSyntax(extracted);
console.log('STRIPPED:\n', stripped);
const php = jsHelperToPhpFunction('forgewp_blk_team_avatarUrl', stripped);
console.log('PHP:\n', php);

const helpers = extractSameFileHelpers(src, 'avatarUrl(row.avatar)', new Set(['AboutTeam']));
console.log('HELPERS:', helpers.map((h) => h.name));
