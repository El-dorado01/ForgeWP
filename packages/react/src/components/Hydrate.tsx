import React from "react";

export interface HydrateProps {
  /**
   * The performance strategy trigger to initiate client-side hydration.
   * - 'load': Hydrates immediately after page load.
   * - 'visible': Hydrates lazily when the component enters the viewport.
   * - 'interaction': Hydrates only when a click, hover, or focus event occurs.
   */
  trigger?: "load" | "visible" | "interaction";
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
   * The single interactive React Component to undergo selective hydration.
   */
  children: React.ReactElement;
}

export function Hydrate({ trigger = "visible", id, clientOnly = false, children }: HydrateProps) {
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
      style={{ display: "contents" }}
    >
      {shouldRender ? children : null}
    </div>
  );
}
