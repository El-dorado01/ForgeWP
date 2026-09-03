import { WpHead, type WpHeadProps } from "./WpHead";

export interface SEOProps extends WpHeadProps {
  noIndex?: boolean;
}

/**
 * `<SEO>` — ForgeWP SEO manager component.
 *
 * Use in `src/app/layout.tsx` to set global metadata defaults,
 * and in individual page files to override metadata per-page.
 */
export function SEO({
  title,
  description = "A WordPress theme built with ForgeWP — React & Tailwind CSS.",
  keywords = "WordPress, React, Tailwind CSS, ForgeWP",
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterCreator,
  canonical,
  noIndex = false,
  schema,
  children,
}: SEOProps) {
  return (
    <WpHead
      title={title}
      description={description}
      keywords={keywords}
      ogTitle={ogTitle}
      ogDescription={ogDescription}
      ogImage={ogImage}
      ogType={ogType}
      twitterCard={twitterCard}
      twitterCreator={twitterCreator}
      canonical={canonical}
      schema={schema}
    >
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {children}
    </WpHead>
  );
}

export default SEO;
