import { useWpMenu } from "../hooks";
import type { WpMenuItem, WpMenuLocation } from "../types";

export interface WpMenuProps {
  /**
   * Optional manual items. If not passed, it will load dynamically
   * using the useWpMenu hook for the specified location.
   */
  items?: WpMenuItem[];
  /** Menu location key — matches a key in your cms/menus.json */
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
  items: manualItems,
  location = "primary",
  className = "",
  linkClassName = "",
}: WpMenuProps) {
  const { items: dynamicItems } = useWpMenu(location);
  const items = manualItems || dynamicItems;

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
