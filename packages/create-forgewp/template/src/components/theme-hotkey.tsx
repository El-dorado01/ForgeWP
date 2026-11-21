import { useEffect } from "react";

/** localStorage key holding an explicit "light" | "dark" choice. */
const THEME_STORAGE_KEY = "forgewp-theme";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Press "d" to toggle light/dark. Dark is the default; the choice is remembered in
 * localStorage. Renders nothing; the home page hydrates it as an island so the
 * hotkey also works in the exported WordPress theme.
 */
export function ThemeHotkey() {
  useEffect(() => {
    const root = document.documentElement;

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if ((saved === "dark" || saved === "light") && !root.classList.contains(saved)) {
        root.classList.remove("light", "dark");
        root.classList.add(saved);
      }
    } catch {
      // Storage unavailable: stay on the default (dark).
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "d" || isTypingTarget(event.target)) return;

      const next = root.classList.contains("light") ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the toggle still applies.
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

export default ThemeHotkey;
