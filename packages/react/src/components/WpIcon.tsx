import React from "react";
import * as Lucide from "lucide-react";

export interface WpIconProps {
  name: string;              // Dynamic icon slug from database (e.g. row.icon)
  provider?: string;         // 'lucide' (default) | 'heroicons' | 'custom'
  className?: string;        // Styling classes
}

/**
 * `<WpIcon>` — Isomorphic dynamic SVG primitive.
 *
 * In Local Dev: Renders standard inline Lucide SVGs dynamically.
 * In production SSR: Emits structured `<forgewp-icon-placeholder>` tags for compile-time inline SVG swap.
 */
export function WpIcon({
  name,
  provider = "lucide",
  className = "",
  ...otherProps
}: WpIconProps) {
  const IS_DEV =
    typeof import.meta !== "undefined" &&
    // @ts-ignore
    import.meta.env?.DEV === true;

  if (IS_DEV) {
    if (provider === "lucide") {
      const toPascalCase = (str: string) => {
        if (!str) return "";
        const camel = str.replace(/[-_]([a-z])/g, (_, g) => g.toUpperCase());
        return camel.charAt(0).toUpperCase() + camel.slice(1);
      };

      const pascalName = toPascalCase(name);
      const IconComponent = (Lucide as any)[pascalName] || (Lucide as any)[name];

      if (IconComponent) {
        return <IconComponent className={className} {...otherProps} />;
      }
    }

    // Fallback in dev if provider is different or icon not found
    return <span className={className}>{name}</span>;
  }

  // Production SSR Mode (Node)
  // Renders compile-time placeholder with class attribute
  return React.createElement(
    "forgewp-icon-placeholder",
    {
      name,
      provider,
      class: className || undefined,
      ...otherProps,
    }
  );
}
