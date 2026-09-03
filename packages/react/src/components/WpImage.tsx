import React, { useContext } from "react";
import { WpPostContext } from "../context";
import type { WpAttachment, StaticImageData } from "../types";

export type { StaticImageData };

export interface WpImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "id"> {
  /**
   * Source of the image. Can be:
   * - A URL string (e.g. "https://...", "/assets/hero.jpg")
   * - A static image import object ({ src, width, height })
   * - A WordPress attachment object ({ id, url, alt, ... })
   * - A WordPress attachment ID (number)
   */
  src?: string | StaticImageData | WpAttachment | number;
  /**
   * Alternative text description for accessibility and SEO.
   */
  alt?: string;
  /**
   * Intrinsic width in pixels.
   */
  width?: number | string;
  /**
   * Intrinsic height in pixels.
   */
  height?: number | string;
  /**
   * When true, marks this image as high-priority (e.g. LCP/Hero image).
   * Automatically sets fetchpriority="high", loading="eager", and signals compiler preload.
   */
  priority?: boolean;
  /**
   * Browser loading strategy. Defaults to "eager" if priority=true, otherwise "lazy".
   */
  loading?: "lazy" | "eager";
  /**
   * Image decoding strategy. Defaults to "async".
   */
  decoding?: "async" | "sync" | "auto";
  /**
   * Responsive sizes definition (e.g. "(max-width: 768px) 100vw, 50vw").
   */
  sizes?: string;
  /**
   * Placeholder mode while loading.
   */
  placeholder?: "empty" | "blur";
  /**
   * Base64 blur placeholder data URL when placeholder="blur".
   */
  blurDataURL?: string;
  /**
   * Build-time optimization directive for external or local assets.
   * - "auto": Automatic detection based on source.
   * - "build": Force download & build-time optimization for external URLs.
   * - "none": Passthrough without transformation.
   */
  optimize?: "auto" | "build" | "none";
  /**
   * WordPress custom field or "featuredImage" key.
   */
  field?: string;
  /**
   * WordPress attachment ID.
   */
  id?: number;
  /**
   * WordPress image sub-size (e.g. "thumbnail", "medium", "large", "full").
   */
  size?: "thumbnail" | "medium" | "large" | "full" | string;
  /**
   * Mock attachments list for local development resolution.
   */
  attachments?: WpAttachment[];
}

const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 1024, height: 768 },
  full: { width: 1200, height: 800 },
};

export function WpImage({
  src,
  alt = "",
  width,
  height,
  priority = false,
  loading,
  decoding = "async",
  sizes,
  placeholder = "empty",
  blurDataURL,
  optimize = "auto",
  field,
  id,
  size = "full",
  className = "",
  style,
  attachments = [],
  ...otherProps
}: WpImageProps) {
  // Resolve effective loading strategy
  const effectiveLoading = loading || (priority ? "eager" : "lazy");
  const effectiveFetchPriority = priority ? "high" : undefined;

  // Resolve source, dimensions, and alt text from static image imports or attachment objects
  let resolvedSrc = "";
  let resolvedAlt = alt;
  let resolvedWidth = width;
  let resolvedHeight = height;
  let resolvedBlurDataURL = blurDataURL;
  let resolvedAttachmentId: number | undefined = id;

  if (typeof src === "number") {
    resolvedAttachmentId = src;
  } else if (src && typeof src === "object") {
    if ("url" in src) {
      // WpAttachment object
      const att = src as WpAttachment;
      resolvedAttachmentId = att.id;
      resolvedSrc = (size && att.sizes?.[size]?.url) || att.url;
      resolvedAlt = att.alt || alt;
      if (!resolvedWidth && att.width) resolvedWidth = att.width;
      if (!resolvedHeight && att.height) resolvedHeight = att.height;
    } else if ("src" in src) {
      // StaticImageData object from image import
      const staticImg = src as StaticImageData;
      resolvedSrc = staticImg.src;
      if (!resolvedWidth && staticImg.width) resolvedWidth = staticImg.width;
      if (!resolvedHeight && staticImg.height) resolvedHeight = staticImg.height;
      if (!resolvedBlurDataURL && staticImg.blurDataURL) resolvedBlurDataURL = staticImg.blurDataURL;
    }
  } else if (typeof src === "string") {
    resolvedSrc = src;
  }

  const isSSR =
    typeof window === "undefined" || (window as any)._forgeWpCompileTime;

  // ── Production SSR / Compile-Time Rendering ─────────────────────────────────
  if (isSSR) {
    return React.createElement("forgewp-image", {
      "data-src": resolvedSrc || undefined,
      "data-id": resolvedAttachmentId !== undefined ? String(resolvedAttachmentId) : undefined,
      "data-field": field || undefined,
      "data-size": size || undefined,
      "data-class-name": className || undefined,
      "data-alt": resolvedAlt || undefined,
      "data-width": resolvedWidth !== undefined ? String(resolvedWidth) : undefined,
      "data-height": resolvedHeight !== undefined ? String(resolvedHeight) : undefined,
      "data-priority": priority ? "true" : undefined,
      "data-loading": effectiveLoading,
      "data-decoding": decoding,
      "data-sizes": sizes || undefined,
      "data-placeholder": placeholder !== "empty" ? placeholder : undefined,
      "data-blur-data-url": resolvedBlurDataURL || undefined,
      "data-optimize": optimize !== "auto" ? optimize : undefined,
      style,
      className,
      ...otherProps,
    });
  }

  // ── Client / Decoupled / Dev Mode Rendering ─────────────────────────────────
  const post = useContext(WpPostContext);
  const dimensions = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.full;

  const resolveFromAttachment = (att: WpAttachment) => {
    resolvedAlt = att.alt || alt;
    if (size && att.sizes?.[size]) {
      return att.sizes[size].url;
    }
    return att.url;
  };

  if (!resolvedSrc) {
    if (resolvedAttachmentId !== undefined) {
      const numericId = Number(resolvedAttachmentId);
      const att = attachments.find((a) => a.id === numericId);
      if (att) {
        resolvedSrc = resolveFromAttachment(att);
      } else {
        resolvedSrc = `https://picsum.photos/seed/attachment-${numericId}/${dimensions.width}/${dimensions.height}`;
      }
    } else if (field !== undefined) {
      if (field === "featuredImage" && post?.featuredImage) {
        if (typeof post.featuredImage === "string") {
          resolvedSrc = post.featuredImage;
        } else {
          resolvedSrc = resolveFromAttachment(post.featuredImage);
        }
      } else if (post?.customFields && post.customFields[field] !== undefined) {
        const val = post.customFields[field];
        if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val))) {
          const numericId = Number(val);
          const att = attachments.find((a) => a.id === numericId);
          if (att) {
            resolvedSrc = resolveFromAttachment(att);
          } else {
            resolvedSrc = `https://picsum.photos/seed/attachment-${numericId}/${dimensions.width}/${dimensions.height}`;
          }
        } else if (typeof val === "string") {
          resolvedSrc = val;
        }
      }

      if (!resolvedSrc) {
        resolvedSrc = `https://picsum.photos/seed/post-${post?.id || 1}-${field}/${dimensions.width}/${dimensions.height}`;
      }
    } else {
      resolvedSrc = `https://picsum.photos/seed/image-fallback/${dimensions.width}/${dimensions.height}`;
    }
  }

  // Auto-resolve local relative asset paths to WordPress theme URI on client
  if (
    resolvedSrc &&
    typeof resolvedSrc === "string" &&
    typeof window !== "undefined" &&
    !resolvedSrc.startsWith("http://") &&
    !resolvedSrc.startsWith("https://") &&
    !resolvedSrc.startsWith("//") &&
    !resolvedSrc.startsWith("data:") &&
    !resolvedSrc.startsWith("blob:")
  ) {
    const themeUri =
      (window as any).forgeWpHydration?.themeUri ||
      (window as any).forgeWpThemeUri ||
      (window as any).forgewpData?.themeUri;
    if (themeUri) {
      resolvedSrc =
        themeUri.replace(/\/+$/, "") +
        "/" +
        resolvedSrc.replace(/^(\/|\.\/)+/, "");
    }
  }

  const mergedStyle: React.CSSProperties = {
    ...(placeholder === "blur" && resolvedBlurDataURL
      ? {
          backgroundImage: `url("${resolvedBlurDataURL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
    ...style,
  };

  return (
    <img
      src={resolvedSrc}
      alt={resolvedAlt}
      width={resolvedWidth}
      height={resolvedHeight}
      loading={effectiveLoading}
      decoding={decoding}
      fetchPriority={effectiveFetchPriority}
      sizes={sizes}
      className={className}
      style={mergedStyle}
      {...otherProps}
    />
  );
}
