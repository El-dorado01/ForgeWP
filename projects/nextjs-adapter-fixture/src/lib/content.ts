import 'server-only';
import fixtures from '../../cms/mock-data.json';
// Fixture-only boundary. No WordPress transport or native live-binding claim.
export async function getPage(slug: string) {
  return fixtures.page.find((page) => page.slug === slug) ?? null;
}
