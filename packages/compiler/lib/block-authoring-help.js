export const blockAuthoringHelp = `
Choose an authoring path:
  @forgewp-block   Expose an existing component with inferred simple props.
  defineBlock()    Declare attributes, editor controls, and visitor rendering explicitly.
  make:block      Scaffold editable defineBlock source in src/blocks/.
  make:shell      Scaffold a layout parent with InnerBlocks; children remain separate blocks.
  BlockArea       Reserve Gutenberg content inside a fixed React template.

Generators write source files you can edit. Export generates WordPress block.json,
render.php, and editor assets from that source; keep changes in source files.
`;
