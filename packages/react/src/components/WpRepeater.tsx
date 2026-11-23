import React, { useContext } from "react";
import { WpPostContext } from "../context";
import { getForgeWpRuntime, hasNativeHydration } from "../runtime/index.js";

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
    (typeof window !== "undefined" && (window as any)._forgeWpCompileTime)
      ? false
      : (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true) ||
        (typeof window !== "undefined" && !hasNativeHydration());

  const post = useContext(WpPostContext);

  if (IS_DECOUPLED) {
    let runtimeRows: unknown;
    try {
      const editables = getForgeWpRuntime().peek('editables');
      if (editables && !editables.protected) {
        runtimeRows = editables.fields?.[name];
      }
    } catch {
      // Runtime unconfigured
    }
    const candidate =
      Array.isArray(runtimeRows) && runtimeRows.length > 0
        ? runtimeRows
        : Array.isArray(post?.customFields?.[name]) && post.customFields[name].length > 0
          ? post.customFields[name]
          : defaultValue;
    const dataArray = Array.isArray(candidate) ? candidate : [];
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
