import React from "react";

export interface WpIconProps {
  /** Icon slug (e.g. "award", "map-pin"). Optional — defaults to "star". */
  name?: string;
  /**
   * Icon source / package:
   * - `lucide` (default) — lucide-react when installed
   * - `dashicons` — WordPress Dashicons
   * - `custom` — theme custom SVG map
   * - any npm package id the project has installed (e.g. `@heroicons/react/24/outline`)
   *
   * Missing packages never throw; a neutral fallback is rendered instead.
   */
  provider?: string;
  className?: string;
}

function toPascalCase(str: string): string {
  if (!str) return "";
  const camel = str.replace(/[-_]([a-zA-Z0-9])/g, (_, g: string) => g.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toKebabCase(str: string): string {
  if (!str) return "";
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function resolveFromModule(mod: any, slug: string): React.ComponentType<any> | null {
  if (!mod || !slug) return null;
  const pascal = toPascalCase(slug);
  const candidates = [
    mod[pascal],
    mod[`${pascal}Icon`],
    mod[slug],
    mod.default?.[pascal],
    mod.default?.[`${pascal}Icon`],
    mod.default?.[slug],
    mod.icons?.[pascal],
    mod.icons?.[slug],
  ];
  for (const c of candidates) {
    if (typeof c === "function" || (c && (c.$$typeof || c.render))) {
      return c as React.ComponentType<any>;
    }
  }
  return null;
}

function normalizeProvider(provider?: string): string {
  if (!provider || provider === "lucide") return "lucide-react";
  return provider;
}

const providerModuleCache = new Map<string, Promise<any> | any>();

function FallbackGlyph({
  slug,
  provider,
  className,
}: {
  slug: string;
  provider: string;
  className?: string;
}) {
  if (provider === "dashicons") {
    return (
      <span
        className={`dashicons dashicons-${toKebabCase(slug)}${className ? ` ${className}` : ""}`}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={className}
      data-forgewp-icon={slug}
      data-forgewp-provider={provider}
      title={`Icon unavailable: ${provider}/${slug}`}
      aria-hidden
      style={{
        display: "inline-flex",
        width: "1em",
        height: "1em",
        borderRadius: 2,
        background: "currentColor",
        opacity: 0.25,
      }}
    />
  );
}

/**
 * `<WpIcon>` — Isomorphic dynamic icon primitive.
 *
 * Vite / hydration: dynamically imports the provider package when present.
 * Production SSR: emits `<forgewp-icon-placeholder>` for PHP (SVG registry / dashicons).
 * Unknown provider or missing package: never crashes the tree.
 */
export function WpIcon({
  name = "star",
  provider = "lucide",
  className = "",
  ...otherProps
}: WpIconProps) {
  const slug = String(name || "star").replace(/^dashicons-/, "");
  const pkg = normalizeProvider(provider);

  const isBrowser = typeof window !== "undefined";
  const isCompileTime = isBrowser && !!(window as any)._forgeWpCompileTime;

  // Block editor (and any host that injects the curated SVG registry)
  if (
    isBrowser &&
    !isCompileTime &&
    typeof (window as any).forgeWpRenderIcon === "function"
  ) {
    try {
      return (window as any).forgeWpRenderIcon(slug, className, provider || "lucide");
    } catch {
      /* fall through to dynamic import / fallback */
    }
  }

  // Live browser (Vite dev OR WP frontend after island hydrate).
  // Do NOT emit forgewp-icon-placeholder here — that only works when PHP processes markup.
  // Previously `forgeWpHydration` forced the SSR path and icons vanished after hydrate.
  const useClientIcon = isBrowser && !isCompileTime;

  const [IconComp, setIconComp] = React.useState<React.ComponentType<any> | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!useClientIcon) return;
    if (provider === "dashicons" || provider === "custom") {
      setFailed(true);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        let pending = providerModuleCache.get(pkg);
        if (!pending) {
          pending = import(/* @vite-ignore */ pkg).catch((err) => {
            providerModuleCache.delete(pkg);
            throw err;
          });
          providerModuleCache.set(pkg, pending);
        }
        const mod = await pending;
        if (cancelled) return;
        const resolved = resolveFromModule(mod, slug);
        if (resolved) setIconComp(() => resolved);
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [useClientIcon, pkg, provider, slug]);

  if (useClientIcon) {
    if (IconComp) {
      return <IconComp className={className} {...otherProps} />;
    }
    if (failed || provider === "dashicons") {
      return <FallbackGlyph slug={slug} provider={provider || "lucide"} className={className} />;
    }
    // Brief load state
    return (
      <span
        className={className}
        aria-hidden
        style={{ display: "inline-block", width: "1em", height: "1em" }}
      />
    );
  }

  // Node SSR / compile-time static render — PHP replaces this placeholder
  return React.createElement("forgewp-icon-placeholder", {
    name: slug,
    provider: provider || "lucide",
    class: className || undefined,
    ...otherProps,
  });
}
