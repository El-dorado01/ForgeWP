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
  /**
   * Explicit opt-in for local preview editing outside dev servers (e.g. static fixture previews).
   * Ignored during compile-time SSR and production WordPress hydration.
   */
  previewEditable?: boolean;
}

const WpEditablePreviewContext = React.createContext(false);

/**
 * Explicitly opt a local preview subtree into inline `contentEditable` editing outside dev servers.
 * Ignored during compile-time SSR and production WordPress visitor hydration.
 */
export function WpEditablePreviewProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WpEditablePreviewContext.Provider value={enabled}>
      {children}
    </WpEditablePreviewContext.Provider>
  );
}

/**
 * `<WpEditable>` — A strongly-typed isomorphic primitive for in-canvas inline editing.
 *
 * Offline Local Dev: Renders as a native HTML contentEditable element after mount (SSR-hydration safe).
 * Gutenberg Editor: Transpiled by ForgeWP compiler into native `<RichText>` controls.
 * Visitor Frontend: Transpiled by ForgeWP compiler into standard static HTML tags with secure PHP escaping.
 */
export function WpEditable<T extends ElementType = 'div'>({
  tagName,
  value = '',
  onChange,
  className = '',
  previewEditable = false,
  ...props
}: WpEditableProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof WpEditableProps<T>>) {
  const Tag = tagName || 'div';
  const previewContextEnabled = React.useContext(WpEditablePreviewContext);
  const [hydratedClient, setHydratedClient] = React.useState(false);

  React.useEffect(() => {
    setHydratedClient(true);
  }, []);

  const isCompileTime =
    (typeof window !== 'undefined' && !!(window as any)._forgeWpCompileTime) ||
    (typeof globalThis !== 'undefined' &&
      (!!(globalThis as any)._forgeWpCompileTime ||
        (globalThis as any).process?.env?.FORGEWP_NATIVE_EXPORT === '1'));

  const isProductionWordPressVisitor =
    typeof window !== 'undefined' && !!(window as any).forgeWpHydration;

  const isDevRuntime =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true) ||
    (typeof globalThis !== 'undefined' &&
      (globalThis as any).process?.env?.NODE_ENV === 'development');

  // Keep server and initial client hydration attributes identical (false on SSR & first paint),
  // activating contentEditable only after client mount inside local dev or explicit preview opt-in,
  // and never during compile-time export or on production WordPress visitor pages.
  const isEditable =
    !isCompileTime &&
    !isProductionWordPressVisitor &&
    hydratedClient &&
    (isDevRuntime || previewEditable || previewContextEnabled);

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
      contentEditable={isEditable || undefined}
      suppressContentEditableWarning={isEditable || undefined}
      onBlur={isEditable ? handleBlur : undefined}
      onKeyDown={isEditable ? handleKeyDown : undefined}
      className={`forgewp-editable ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: value }}
      {...props}
    />
  );
}
