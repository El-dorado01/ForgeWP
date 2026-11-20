import 'server-only';
import { mockData } from '../../cms/mock-data';

export interface FixturePageRecord {
  id: number;
  slug: string;
  title: string;
  content: string;
  blocks?: Array<{
    blockName: string | null;
    attrs?: Record<string, unknown>;
    innerHTML?: string;
  }>;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export async function getPage(slug: string): Promise<FixturePageRecord | null> {
  const wpUrl = process.env.FORGEWP_WP_URL?.replace(/\/+$/, '');
  if (!wpUrl) {
    const local = (mockData.page || []).find((page) => page.slug === slug);
    if (!local) return null;
    return {
      id: local.id,
      slug: local.slug || slug,
      title: local.title || '',
      content: local.content || '',
      blocks: [],
    };
  }

  try {
    let page: any = null;
    const bySlugRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (bySlugRes.ok) {
      const list = await bySlugRes.json();
      if (Array.isArray(list) && list.length > 0) {
        page = list[0];
      }
    }

    if (!page) {
      const routesRes = await fetch(`${wpUrl}/wp-json/forgewp/v1/routes`, {
        cache: 'no-store',
      });
      if (routesRes.ok) {
        const routeData = await routesRes.json();
        const match = (routeData?.routes || []).find(
          (r: any) => r.routeId === slug || r.slug === slug,
        );
        if (match?.id) {
          const byIdRes = await fetch(`${wpUrl}/wp-json/wp/v2/pages/${match.id}`, {
            cache: 'no-store',
          });
          if (byIdRes.ok) {
            page = await byIdRes.json();
          }
        }
      }
    }

    if (!page) {
      const fallback = (mockData.page || []).find((p) => p.slug === slug);
      return fallback
        ? {
            id: fallback.id,
            slug: fallback.slug || slug,
            title: fallback.title || '',
            content: fallback.content || '',
            blocks: [],
          }
        : null;
    }

    return {
      id: page.id,
      slug: page.slug || slug,
      title: stripTags(page.title?.rendered || ''),
      content: stripTags(page.content?.rendered || ''),
      blocks: Array.isArray(page.forgewp_blocks) ? page.forgewp_blocks : [],
    };
  } catch {
    return null;
  }
}
