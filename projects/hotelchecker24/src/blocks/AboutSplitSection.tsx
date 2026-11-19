import { defineBlock } from '@forgewp/react';

/**
 * Parent shell — layout only (InnerBlocks).
 *
 * Children are normal ForgeWP blocks. This shell provides the outer chrome +
 * grid; the compiler generates the editor UI and PHP wrapper from
 * `innerBlocks` + `shell`.
 *
 * Scaffolded by: pnpm forgewp make:shell
 */
export default defineBlock({
  name: 'about-split-section',
  title: "About Split Section",
  category: "theme",
  icon: "columns",
  description: "Mission | Values side-by-side layout shell",
  // No content attributes — children own their fields.
  attributes: {},
  innerBlocks: {
    allowedBlocks: [
      'about-mission',
      'about-values',
    ],
    template: [
      ['about-mission'],
      ['about-values'],
    ],
    templateLock: false,
    orientation: "horizontal",
  },
  shell: {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16",
    gridClassName: "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center",
  },
  // Compiler generates the real editor UI from innerBlocks + shell.
  edit: () => null,
});
