import React from "react";
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
  submenuClassName?: string;
  /** Custom render function per menu item (for mega menus / rich dropdowns) */
  renderItem?: (item: WpMenuItem, index: number) => React.ReactNode;
}

/**
 * WpMenu — Renders a navigation menu with optional hierarchical submenus.
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
  submenuClassName = "",
  renderItem,
}: WpMenuProps) {
  const { items: dynamicItems } = useWpMenu(location);
  const items = manualItems || dynamicItems;

  return (
    <nav className={className}>
      {items.map((item, idx) => {
        if (renderItem) {
          return <React.Fragment key={item.id ?? idx}>{renderItem(item, idx)}</React.Fragment>;
        }

        const hasChildren = item.children && item.children.length > 0;
        return (
          <div key={item.id ?? idx} className={item.classes?.join(" ") || undefined}>
            <a
              href={item.url}
              className={linkClassName}
              target={item.target || undefined}
              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            >
              {item.title}
            </a>
            {hasChildren && (
              <div className={submenuClassName}>
                {item.children!.map((child, cIdx) => (
                  <a
                    key={child.id ?? cIdx}
                    href={child.url}
                    className={linkClassName}
                    target={child.target || undefined}
                    rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
                  >
                    {child.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

