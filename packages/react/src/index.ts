/**
 * @forgewp/react
 *
 * Lightweight WordPress data hooks and primitives for React.
 * A thin data bridge — not a framework, not a rendering engine.
 *
 * Public API surface (intentionally minimal):
 *
 *   Components:    WpQueryLoop, WpMenu, WpShortcode
 *   Hooks:         useWpTitle, useWpContent, useWpExcerpt, useWpPermalink,
 *                  useWpDate, useWpAuthor, useWpFeaturedImage, useWpCustomField
 *   Types:         WpPost, WpMenuItem, WpMenuData, WpMenuLocation
 *   Context:       WpPostContext (advanced use only)
 */

// Components
export { WpQueryLoop } from "./components/WpQueryLoop";
export type { WpQueryLoopProps } from "./components/WpQueryLoop";

export { WpMenu } from "./components/WpMenu";
export type { WpMenuProps } from "./components/WpMenu";

export { WpShortcode } from "./components/WpShortcode";
export type { WpShortcodeProps } from "./components/WpShortcode";

// Hooks
export {
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpPermalink,
  useWpDate,
  useWpAuthor,
  useWpFeaturedImage,
  useWpCustomField,
} from "./hooks";

// Types
export type { WpPost, WpMenuItem, WpMenuData, WpMenuLocation } from "./types";

// Context (exposed for advanced integrations — use sparingly)
export { WpPostContext } from "./context";
