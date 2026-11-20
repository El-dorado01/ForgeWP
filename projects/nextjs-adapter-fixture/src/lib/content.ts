import 'server-only';
import { createWpServerClient, type WpServerPageRecord } from '@forgewp/react/server';
import { mockData } from '../../cms/mock-data';

export type FixturePageRecord = WpServerPageRecord;

export const wpServer = createWpServerClient({
  fixtures: mockData,
});

export async function getPage(slug: string): Promise<FixturePageRecord | null> {
  return wpServer.getPage(slug);
}
