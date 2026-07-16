import React, { ComponentPropsWithoutRef, ElementType } from 'react';

export interface WpEditableProps<T extends ElementType = 'div'> {
  /**
   * The HTML element or React component to render (e.g. 'h1', 'h2', 'p', 'div', 'span')
   */
  tagName?: T;
  /**
   * The value of the editable content
   */
  value?: string;
  /**
   * Callback fired when editing is completed (typically on blur or Enter in single-line mode)
   */
  onChange?: (value: string) => void;
  /**
   * Optional custom classes or other standard props
   */
  className?: string;
}

/**
 * `<WpEditable>` — A strongly-typed isomorphic primitive for in-canvas inline editing.
 *
 * Offline Local Dev: Renders as a native HTML contentEditable element.
 * Gutenberg Editor: Transpiled by ForgeWP compiler into native `<RichText>` controls.
 * Visitor Frontend: Transpiled by ForgeWP compiler into standard static HTML tags with secure PHP escaping.
 */
export function WpEditable<T extends ElementType = 'div'>({
  tagName,
  value = '',
  onChange,
  className = '',
  ...props
}: WpEditableProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof WpEditableProps<T>>) {
  const Tag = tagName || 'div';

  // _forgeWpCompileTime gates the Node SSR pass used to bake static export
  // HTML (render-theme.mts) — that context also lacks forgeWpHydration, so
  // without this short-circuit it would be misread as "local dev" and ship
  // a live, native-editable contenteditable="true" to real site visitors.
  const isEditable =
    (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime)
      ? false
      : (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true) ||
        (typeof window !== 'undefined' && !(window as any).forgeWpHydration);

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (onChange) {
      onChange(e.currentTarget.innerHTML || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // If it's a single line element like h1-h6 or span, trigger onChange on Enter press
    const singleLineTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
    if (singleLineTags.includes(String(Tag)) && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <Tag
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={isEditable ? handleBlur : undefined}
      onKeyDown={isEditable ? handleKeyDown : undefined}
      className={`forgewp-editable ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: value }}
      {...props}
    />
  );
}
