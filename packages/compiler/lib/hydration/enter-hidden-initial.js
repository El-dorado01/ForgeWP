/**
 * Detect enter-hidden animation initials used by motion libraries.
 * Covers both `initial={{ opacity: 0 }}` and `initial="hidden"` +
 * `variants.hidden = { opacity: 0 }`. Theme-agnostic: any object with
 * a hidden enter style counts, regardless of component name.
 */

export function isEnterHiddenStyle(style) {
  if (!style || typeof style !== "object") return false;
  if (style.opacity === 0) return true;
  if (typeof style.scale === "number" && style.scale !== 1) return true;
  if (typeof style.x === "number" && style.x !== 0) return true;
  if (typeof style.y === "number" && style.y !== 0) return true;
  return false;
}

export function resolveInitialStyle(props) {
  if (!props || props.initial == null) return props && props.initial;
  if (typeof props.initial === "string" && props.variants && typeof props.variants === "object") {
    return props.variants[props.initial];
  }
  return props.initial;
}

const ENTER_VARIANT_NAME = /^(hidden|initial|start|inactive)$/i;

export function shouldSkipEnterInitial(props) {
  if (!props || props.initial === false) return false;

  if (props.initial != null && isEnterHiddenStyle(resolveInitialStyle(props))) {
    return true;
  }

  // Stagger parents: initial="hidden" + animate="visible" with an empty
  // variants.hidden. Children inherit the named variant and apply their
  // own { opacity: 0 } — those children often never hydrate.
  if (typeof props.initial === "string" && ENTER_VARIANT_NAME.test(props.initial)) {
    if (props.animate === "visible" || props.whileInView === "visible") return true;
    if (props.variants && props.variants.visible) return true;
  }

  // Child that only declares variants (initial inherited from parent).
  if (
    props.initial == null &&
    props.variants &&
    isEnterHiddenStyle(props.variants.hidden) &&
    props.variants.visible
  ) {
    return true;
  }

  return false;
}

/**
 * Props to use during compile-time SSR so hidden enter states paint visible.
 */
export function visibleFirstPaintProps(props) {
  if (!props || !shouldSkipEnterInitial(props)) return props;
  const next = { ...props, initial: false };
  if (props.variants && props.variants.visible && (props.animate == null || props.animate === "visible" || props.whileInView)) {
    next.animate = "visible";
  }
  return next;
}
