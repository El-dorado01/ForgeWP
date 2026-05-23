import React from "react";

export interface HydrateProps {
  /**
   * The performance strategy trigger to initiate client-side hydration.
   * - 'load': Hydrates immediately after page load.
   * - 'visible': Hydrates lazily when the component enters the viewport.
   * - 'interaction': Hydrates only when a click, hover, or focus event occurs.
   * - 'click': Hydrates only when a click event occurs.
   * - 'hover': Hydrates only when a mouseenter/hover event occurs.
   * - 'idle': Hydrates during browser idle periods using requestIdleCallback.
   */
  trigger?: "load" | "visible" | "interaction" | "idle" | "click" | "hover";
  /**
   * Optional custom bundle identifier. If omitted, ForgeWP automatically
   * resolves the dynamic chunk name using the child's Component name in kebab-case.
   */
  id?: string;
  /**
   * Bypasses server-side rendering entirely. The component will render a clean
   * empty placeholder during SSR, and mount fully on the client. Essential for
   * components relying on browser-only APIs (window, document, maps, charts).
   */
  clientOnly?: boolean;
  /**
   * Advanced predictive preloading strategy.
   * - 'near-visible': Preloads the dynamic bundle script when the element is near the viewport
   *   (e.g., 600px margin) before full intersection triggers hydration.
   */
  preload?: "near-visible" | "none";
  /**
   * Restricts hydration to devices matching a CSS Media Query.
   * @example "(max-width: 768px)" (hydrate only on mobile/tablet)
   */
  media?: string;
  /**
   * Restricts hydration based on user connection speed.
   * - 'fast': Skips or defers hydration entirely on slow 2G/3G networks or Save-Data mode.
   */
  connection?: "fast" | "any";
  /**
   * Optional CSS class name(s) to apply directly to the hydration island wrapper element.
   * Use this to pass layout-critical styles such as `sticky`, `flex`, `grid`, etc.
   * without needing global CSS attribute selector workarounds.
   *
   * @example
   * <Hydrate className="sticky top-0 z-40 w-full">
   *   <NavigationHeader />
   * </Hydrate>
   */
  className?: string;
  /**
   * Optional inline styles to apply directly to the hydration island wrapper element.
   * Merged with the mandatory `display: block` internal style.
   * Use when Tailwind classes are unavailable or for dynamic style values.
   *
   * @example
   * <Hydrate style={{ position: 'sticky', top: 0, zIndex: 40 }}>
   *   <NavigationHeader />
   * </Hydrate>
   */
  style?: React.CSSProperties;
  /**
   * The single interactive React Component to undergo selective hydration.
   */
  children: React.ReactElement;
}

export function Hydrate({
  trigger = "visible",
  id,
  clientOnly = false,
  preload = "none",
  media,
  connection = "any",
  className,
  style,
  children,
}: HydrateProps) {
  // Enforce single children constraint
  if (!children || typeof children !== "object") {
    return null;
  }

  // Resolve component name automatically
  const type = children.type as any;
  const inferredName = type?.displayName || type?.name;
  const componentName = id || inferredName;

  if (!componentName) {
    console.warn(
      "ForgeWP <Hydrate> warning: Unable to infer a chunk identifier for the hydrated component. " +
      "Provide an explicit `id` prop or wrap a named React component so the compiler can resolve the chunk name."
    );
  }

  const resolvedName = componentName ?? "dynamic-island";
  const kebabName = resolvedName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  // Serialize initial props so the client Micro-Hydrator can supply them upon dynamic import mount
  const propsData = children.props ? JSON.stringify(children.props) : "{}";

  // SSR bypass guard for client-only elements
  const isSSR = typeof window === "undefined";
  const shouldRender = !clientOnly || !isSSR;

  return (
    <div
      data-forgewp-hydrate={kebabName}
      data-forgewp-trigger={trigger}
      data-forgewp-props={propsData}
      data-forgewp-client-only={clientOnly ? "true" : undefined}
      data-forgewp-preload={preload !== "none" ? preload : undefined}
      data-forgewp-media={media || undefined}
      data-forgewp-connection={connection !== "any" ? connection : undefined}
      className={className}
      style={{ display: "block", ...style }}
    >
      {shouldRender ? children : null}
    </div>
  );
}

