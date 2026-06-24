import React, { useContext } from "react";
import { WpPostContext } from "../context";

export interface WpRepeaterProps<T> {
  name: string;                                    // Post meta key for the repeater
  defaultValue?: T[];                              // Mock values for local dev/Vite SPA
  children: (row: T, index: number) => React.ReactNode; // Render-prop loop
}

/**
 * `<WpRepeater>` — Isomorphic framework primitive for post meta loops.
 *
 * In Local Dev: Maps the render-prop loop over mock values.
 * In production SSR: Emits structured compile-time tokens and wraps the loop in custom tag delimiters.
 */
export function WpRepeater<T extends Record<string, any>>({
  name,
  defaultValue = [],
  children,
}: WpRepeaterProps<T>) {
  const IS_DECOUPLED =
    (typeof import.meta !== "undefined" && import.meta.env?.DEV === true) ||
    (typeof window !== "undefined" && !(window as any).forgeWpHydration);

  const post = useContext(WpPostContext);

  if (IS_DECOUPLED) {
    const data = post?.customFields?.[name] || defaultValue || [];
    const dataArray = Array.isArray(data) ? data : [];
    return (
      <>
        {dataArray.map((row, index) => children(row, index))}
      </>
    );
  }

  // Production SSR Mode (Node)
  // We use a Proxy to dynamically capture all properties accessed inside the render loop
  const accessedKeys = new Set<string>();
  const proxyRow = new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === "string") {
        accessedKeys.add(prop);
        return `__FORGEWP_REPEATER_FIELD_${prop}__`;
      }
      return undefined;
    }
  }) as unknown as T;

  // Execute children render prop once with proxy row to record accessed subfields
  const rendered = children(proxyRow, 0);

  // Return the custom structure with start and end tags
  return React.createElement(
    "forgewp-repeater-start",
    {
      name,
      subfields: Array.from(accessedKeys).join(","),
    },
    rendered,
    React.createElement("forgewp-repeater-end")
  );
}
