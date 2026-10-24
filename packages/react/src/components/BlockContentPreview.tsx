import React from 'react';
import { parse as parseBlocks } from '@wordpress/block-serialization-default-parser';
import parseHtml, { Element } from 'html-react-parser';
import { WpBlockContext, type BlockDefinition } from '../hooks.js';

export type PreviewBlocks = Record<string, BlockDefinition<any>>;

type ParsedBlock = ReturnType<typeof parseBlocks>[number];

function Notice({ name, children }: { name: string; children?: React.ReactNode }) {
  return <div role="status" data-forgewp-preview-unavailable={name}>
    <p>Local preview unavailable: {name}. Check this block in WordPress.</p>
    {children}
  </div>;
}

class PreviewBoundary extends React.Component<
  { name: string; children: React.ReactNode }, { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Notice name={this.props.name} /> : this.props.children;
  }
}

const noEdit = () => {};

/** Local fixture rendering only. WordPress remains the production block runtime. */
export function BlockContentPreview({ content, blocks }: { content: string; blocks: PreviewBlocks }) {
  const tree = React.useMemo(() => {
    try { return parseBlocks(content); } catch { return null; }
  }, [content]);
  if (!tree) return <Notice name="invalid block content" />;

  const renderBlock = (block: ParsedBlock, key: string, depth: number): React.ReactNode => {
    if (depth > 100) return <Notice key={key} name="block nesting limit" />;
    const children = block.innerBlocks.map((child, index) => renderBlock(child, `${key}.${index}`, depth + 1));
    const name = block.blockName;
    const registered = name && (Object.hasOwn(blocks, name) ? blocks[name] :
      name.startsWith('forgewp/') && Object.hasOwn(blocks, name.slice(8)) ? blocks[name.slice(8)] : undefined);
    if (registered) {
      const attributes = Object.fromEntries(Object.entries(registered.attributes || {})
        .filter(([, field]) => field.default !== undefined)
        .map(([field, schema]) => [field, schema.default]));
      Object.assign(attributes, block.attrs || {});
      if (registered.innerBlocks) {
        return <div key={key} className={['forgewp-block-shell', registered.shell?.className].filter(Boolean).join(' ')}>
          <div className={['forgewp-block-shell__grid', registered.shell?.gridClassName].filter(Boolean).join(' ')} style={{ minWidth: 0 }}>{children}</div>
        </div>;
      }
      const View = registered.save || registered.edit;
      return <PreviewBoundary key={`${key}:${content}`} name={name!}>
        <WpBlockContext.Provider value={attributes}>
          <View attributes={attributes} setAttributes={noEdit} />
        </WpBlockContext.Provider>
      </PreviewBoundary>;
    }
    // Saved core markup is a visual fallback; dynamic core/plugin blocks need WordPress.
    if (name && (!name.startsWith('core/') || !block.innerHTML.trim())) {
      return <Notice key={key} name={name}>{children}</Notice>;
    }
    let childIndex = 0;
    const html = block.innerContent.map((part) => part === null
      ? `<forgewp-preview-slot data-index="${childIndex++}"></forgewp-preview-slot>` : part).join('');
    return <React.Fragment key={key}>{parseHtml(html, {
      replace(node) {
        if (node instanceof Element && node.name === 'forgewp-preview-slot') {
          return <React.Fragment>{children[Number(node.attribs['data-index'])]}</React.Fragment>;
        }
      },
    })}</React.Fragment>;
  };
  return <>{tree.map((block, index) => renderBlock(block, String(index), 0))}</>;
}
