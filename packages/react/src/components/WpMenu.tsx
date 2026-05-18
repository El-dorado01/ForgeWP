import type { WpMenuItem, WpMenuLocation } from "../types";

export interface WpMenuProps {
  /**
   * Items to render — injected by the data bridge in src/.forgewp/wordpress.tsx.
   * You do not need to pass this yourself; use the location prop instead.
   */
  items?: WpMenuItem[];
  /** Menu location key — matches a key in your wordpress/menus.json */
  location?: WpMenuLocation;
  className?: string;
  linkClassName?: string;
}

/**
 * WpMenu — Renders a flat list of navigation links.
 *
 * This component is framework-level infrastructure — it contains no
 * styling assumptions beyond className passthrough.
 *
 * The ForgeWP compiler transforms this into a wp_nav_menu() call
 * registered to the given location.
 */
export function WpMenu({
  items = [],
  location: _location = "primary",
  className = "",
  linkClassName = "",
}: WpMenuProps) {
  return (
    <nav className={className}>
      {items.map((item, idx) => (
        <a key={idx} href={item.url} className={linkClassName}>
          {item.title}
        </a>
      ))}
    </nav>
  );
}
