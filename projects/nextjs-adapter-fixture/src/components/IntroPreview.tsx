'use client';
import { useEffect, useState } from 'react';
import { useWpPageLink } from '@forgewp/react';
import intro from '@/blocks/IntroBlock';
// Local preview only: this state is not persisted to WordPress.
export function IntroPreview({ initialHeading }: { initialHeading?: string } = {}) {
  const [attributes, setAttributes] = useState({
    heading: initialHeading ?? intro.attributes!.heading.default!,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const aboutHref = useWpPageLink('about', '/about');
  const Edit = intro.edit;
  const Save = intro.save!;
  return <div data-preview-ready={mounted}>
    {mounted ? <Edit attributes={attributes} setAttributes={(patch) => setAttributes((current) => ({ ...current, ...patch }))} /> : <Save attributes={attributes} />}
    <p><a data-fixture="wordpress-link" href={aboutHref}>WordPress content link (local fallback)</a></p>
    <output aria-live="polite">Preview heading: {attributes.heading}</output>
  </div>;
}
