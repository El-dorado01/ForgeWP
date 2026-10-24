import { createContext } from "react";
import type { WpPost } from "./types.js";

/**
 * WpPostContext — Internal context that WpQueryLoop provides.
 * Hooks like useWpTitle(), useWpExcerpt() etc. read from this.
 * You should never need to access this directly.
 */
export const WpPostContext = createContext<WpPost | null>(null);
