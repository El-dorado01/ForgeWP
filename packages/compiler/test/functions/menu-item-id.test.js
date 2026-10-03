/**
 * Menu ids are object keys in client state. WordPress integers must reach
 * the component as strings, or `Object.keys(state)[i] === item.id` is false
 * and a submenu toggle does nothing.
 */
import { describe, expect, it } from 'vitest';
import { normalizeMenuItems } from '../../../react/src/hooks.ts';

describe('normalizeMenuItems', () => {
  it('turns numeric WordPress ids into strings, including nested children', () => {
    const items = normalizeMenuItems([
      {
        id: 10,
        title: 'Events',
        url: '/events/',
        children: [{ id: 11, title: 'Berlin', url: '/events/berlin/' }],
      },
      { title: 'Home', url: '/' },
    ]);

    expect(items[0].id).toBe('10');
    expect(items[0].children?.[0].id).toBe('11');
    expect(items[0].url).toBe('/events');
    expect(items[1].id).toBeUndefined();
    expect(items[1].url).toBe('/');

    const expanded = { [items[0].id]: false };
    const key = items[0].id;
    const next = Object.keys(expanded).reduce((acc, itemKey) => {
      acc[itemKey] = itemKey === key;
      return acc;
    }, {});
    expect(next['10']).toBe(true);
  });
});
