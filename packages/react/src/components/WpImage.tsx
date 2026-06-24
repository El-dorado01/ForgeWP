import React, { useContext } from "react";
import { WpPostContext } from "../context";
import type { WpAttachment } from "../types";

export interface WpImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "id"> {
  field?: string;
  id?: number;
  size?: "thumbnail" | "medium" | "large" | "full" | string;
  attachments?: WpAttachment[];
}

const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 1024, height: 768 },
  full: { width: 1200, height: 800 },
};

export function WpImage({
  field,
  id,
  size = "full",
  className = "",
  alt = "",
  attachments = [],
  ...otherProps
}: WpImageProps) {
  const IS_DECOUPLED =
    (typeof import.meta !== "undefined" && import.meta.env?.DEV === true) ||
    (typeof window !== "undefined" && !(window as any).forgeWpHydration);

  const post = useContext(WpPostContext);

  if (IS_DECOUPLED) {
    let resolvedSrc = "";
    let resolvedAlt = alt;

    const dimensions = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.full;

    // Helper to resolve source from attachment object
    const resolveFromAttachment = (att: WpAttachment) => {
      resolvedAlt = att.alt || alt;
      if (size && att.sizes?.[size]) {
        return att.sizes[size].url;
      }
      return att.url;
    };

    if (id !== undefined) {
      const numericId = Number(id);
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

    return (
      <img
        src={resolvedSrc}
        alt={resolvedAlt}
        className={className}
        {...otherProps}
      />
    );
  }

  // Production SSR: Output custom tag
  return React.createElement(
    "forgewp-image",
    {
      "data-id": id !== undefined ? String(id) : undefined,
      "data-field": field || undefined,
      "data-size": size || undefined,
      "data-class-name": className || undefined,
      "data-alt": alt || undefined,
      ...otherProps,
    }
  );
}
