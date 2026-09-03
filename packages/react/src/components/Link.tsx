import * as React from 'react';
import { isEditorPreview, isDecoupled } from '../hooks';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: React.ReactNode;
  replace?: boolean;
}

/**
 * Universal Link Component for ForgeWP.
 * - In local React SPA dev mode (isDecoupled): performs instant client-side route transitions
 *   via History API & PopStateEvent without reloading the page.
 * - In native WordPress mode (isWordPress): delegates to standard native <a> navigation
 *   so WordPress loads the requested template with full Speculation Rules prefetch acceleration.
 * - In Gutenberg Block Editor (isEditorPreview): intercepts navigation to avoid breaking editor context.
 */
export function WpLink({
  href,
  children,
  onClick,
  className,
  target,
  replace = false,
  ...props
}: LinkProps) {
  // 1. Gutenberg Editor Preview: prevent leaving wp-admin canvas
  if (isEditorPreview()) {
    return (
      <a
        href={href}
        className={className}
        target={target}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          if (onClick) onClick(e);
        }}
        {...props}
      >
        {children}
      </a>
    );
  }

  // 2. Decoupled Local Dev Mode (Vite SPA): client-side History push without full reload
  if (isDecoupled()) {
    return (
      <a
        href={href}
        className={className}
        target={target}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (onClick) onClick(e);

          // Only intercept standard unmodified primary left clicks on internal paths
          if (
            !e.defaultPrevented &&
            e.button === 0 &&
            (!target || target === '_self') &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.altKey &&
            !e.shiftKey &&
            href &&
            (href.startsWith('/') || href.startsWith('#') || href.startsWith('?'))
          ) {
            e.preventDefault();
            if (replace) {
              window.history.replaceState(null, '', href);
            } else {
              window.history.pushState(null, '', href);
            }
            // Notify wouter and client-side routers listening for navigation
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        {...props}
      >
        {children}
      </a>
    );
  }

  // 3. Live WordPress Mode: native browser navigation with Speculation Rules
  return (
    <a href={href} className={className} target={target} onClick={onClick} {...props}>
      {children}
    </a>
  );
}

export { WpLink as Link };
