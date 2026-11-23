import { createWpServerClient } from '@forgewp/react';
import { mockData } from '../../cms/mock-data';

export const wpClient = createWpServerClient({
  fixtures: mockData,
});

export async function getPageContent(slug: string) {
  const page = await wpClient.getLivePage(slug);
  return (
    page ?? {
      id: 0,
      slug,
      title: slug,
      content: '',
      blocks: [],
      source: 'fixture' as const,
    }
  );
}
