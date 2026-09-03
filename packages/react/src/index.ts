/**
 * @forgewp/react
 *
 * Lightweight WordPress data hooks and primitives for React.
 * A thin data bridge — not a framework, not a rendering engine.
 *
 * Public API surface (intentionally minimal):
 *
 *   Components:    WpQueryLoop, WpMenu, WpShortcode, WpFormFields
 *   Hooks:         useWpTitle, useWpContent, useWpExcerpt, useWpPermalink,
 *                  useWpDate, useWpAuthor, useWpFeaturedImage, useWpCustomField
 *   Functions:     submitWpForm
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

export { SEO } from "./components/SEO";
export type { SEOProps } from "./components/SEO";

export { PresetsStyle } from "./components/PresetsStyle";
export type { PresetsStyleProps } from "./components/PresetsStyle";

export { WpImage } from "./components/WpImage";
export type { WpImageProps, StaticImageData } from "./components/WpImage";

export { WpRepeater } from "./components/WpRepeater";
export type { WpRepeaterProps } from "./components/WpRepeater";

export { WpIcon } from "./components/WpIcon";
export type { WpIconProps } from "./components/WpIcon";

export { WpFormFields } from "./components/WpFormFields";
export type { WpFormFieldsProps, WpFormFieldDescriptor } from "./components/WpFormFields";

export { WpLink, Link } from "./components/Link";
export type { LinkProps } from "./components/Link";

export { Router, Route, Switch, useLocation, useSearch, useParams, useRoute, matchPath, normalizePath } from "./components/Router";
export type { RouterProps, RouteProps, SwitchProps } from "./components/Router";

// Hooks & Utilities
export {
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpPermalink,
  useWpDate,
  useWpModifiedDate,
  useWpAuthor,
  useWpFeaturedImage,
  useWpCustomField,
  useWpField,
  useReducedMotion,
  getStaticMotionStyle,
  useWpOption,
  useWpThemeMod,
  useWpThemeUri,
  resolveWpAsset,
  useWpPageLink,
  useWpMenu,
  useWpQuery,
  useWpPrefetch,
  defineBlock,
  defineTheme,
  useWpMeta,
  submitWpForm,
  resolveDualHost,
  WpBlockContext,
  defineEditable,
  getEditableDefaults,
  buildPageEditable,
  pickEditable,
  mergeEditable,
  text,
  richText,
  image,
  boolean,
  repeater,
  color,
  url,
  select,
  number,
  icon,
  isEditorPreview,
  useIsEditorPreview,
  isDecoupled,
  useIsDecoupled,
  isWordPress,
  useIsWordPress,
  decodeHtmlEntities,
  useWpPagePath,
  useWpSearchParams,
  useWpLocation,
  useWpSearch,
  useWpTerms,
  useWpTaxonomyList,
  useWpI18n,
  useWpLanguage,
} from "./hooks";

export type { WpTerm } from "./hooks";

export type {
  BlockDefinition,
  BlockAttributeDefinition,
  BlockInnerBlocksConfig,
  BlockShellConfig,
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
  RepeaterMode,
  ImageFieldVal,
  ColorField,
  UrlField,
  SelectField,
  NumberField,
  IconField,
  InferAttributes,
  InferFieldType,
  PageEditableSectionSource,
  WpOptionField,
  WpOptionsSchema,
  WpFormResult,
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


// Config helpers & types
export {
  defineWpForm,
  definePageConfig,
  defineWpPosts,
  defineWpMenus,
  defineWpUsers,
  defineWpRoles,
  defineTranslations,
  defineWpThemeMods,
  defineWpOptions,
  optionText,
  optionUrl,
  optionEmail,
  optionTextarea,
  optionToggle,
  optionNumber,
  optionPostPicker,
} from "./config";
export type {
  WpFormConfig,
  WpFormField,
  WpFormFieldType,
  PageConfig,
  WpPostBase,
  WpPostsConfig,
  WpUserSeed,
} from "./config";

// Context (exposed for advanced integrations — use sparingly)
export { WpPostContext } from "./context";

