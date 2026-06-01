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

export { BlockArea } from "./components/BlockArea";
export type { BlockAreaProps } from "./components/BlockArea";

export { WpEditable } from "./components/WpEditable";
export type { WpEditableProps } from "./components/WpEditable";

export { Hydrate } from "./components/Hydrate";
export type { HydrateProps } from "./components/Hydrate";

export { WpHead } from "./components/WpHead";
export type { WpHeadProps } from "./components/WpHead";

export { WpImage } from "./components/WpImage";
export type { WpImageProps } from "./components/WpImage";

// Hooks & Utilities
export {
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpPermalink,
  useWpDate,
  useWpAuthor,
  useWpFeaturedImage,
  useWpCustomField,
  useReducedMotion,
  getStaticMotionStyle,
  useWpOption,
  useWpThemeMod,
  useWpThemeUri,
  useWpPageLink,
  useWpQuery,
  defineBlock,
  defineTheme,
  useWpMeta,
  defineEditable,
  text,
  richText,
  image,
  boolean,
  repeater,
} from "./hooks";

export type {
  BlockDefinition,
  BlockAttributeDefinition,
  ThemeSettings,
  ColorPreset,
  FontSizePreset,
  FontFamilyPreset,
  EditableField,
  EditableSchema,
  TextField,
  RichTextField,
  ImageField,
  BooleanField,
  RepeaterField,
  ImageFieldVal,
} from "./hooks";

// Types
export type {
  WpPost,
  WpAttachment,
  WpMenuItem,
  WpMenuData,
  WpMenuLocation,
  WpQueryArgs,
  WpQueryResults,
  WpTaxQuery,
  WpMetaQuery,
} from "./types";


// Context (exposed for advanced integrations — use sparingly)
export { WpPostContext } from "./context";
