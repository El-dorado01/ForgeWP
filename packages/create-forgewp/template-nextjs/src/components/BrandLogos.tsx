import type { SVGProps } from 'react';

/**
 * Inline brand marks and icons for the starter pages.
 * Inline SVG works in `next dev`, decoupled mode and the exported WordPress theme
 * without an asset pipeline.
 *
 * Next.js mark: Devicon v2.16.0 (MIT). GitHub and arrow icons: Lucide (ISC).
 * Trademarks belong to their owners.
 */

export function ForgeWPLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 44 40' fill='none' aria-label='ForgeWP' role='img' {...props}>
      <g fill='#09090b'>
        <path d='M5 0H40.2Q44 0 41.19 2.56L33 10H5A5 5 0 0 1 5 0Z' />
        <path d='M5 15H22.6Q26.4 15 23.59 17.56L15.4 25H5A5 5 0 0 1 5 15Z' />
        <path d='M5 30H13Q16.8 30 13.99 32.56L5.8 40H5A5 5 0 0 1 5 30Z' />
      </g>
      <circle cx='39' cy='20' r='5' fill='#f97316' />
    </svg>
  );
}

export function NextLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 128 128' aria-label='Next.js' role='img' {...props}>
      <circle cx='64' cy='64' r='64' />
      <path
        fill='url(#forgewp-next-a)'
        d='M106.317 112.014 49.167 38.4H38.4v51.179h8.614v-40.24l52.54 67.884a64.216 64.216 0 0 0 6.763-5.209z'
      />
      <path fill='url(#forgewp-next-b)' d='M81.778 38.4h8.533v51.2h-8.533z' />
      <defs>
        <linearGradient
          id='forgewp-next-a'
          x1='109'
          x2='144.5'
          y1='116.5'
          y2='160.5'
          gradientTransform='scale(.71111)'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#fff' />
          <stop offset='1' stopColor='#fff' stopOpacity='0' />
        </linearGradient>
        <linearGradient
          id='forgewp-next-b'
          x1='121'
          x2='120.799'
          y1='54'
          y2='106.875'
          gradientTransform='scale(.71111)'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#fff' />
          <stop offset='1' stopColor='#fff' stopOpacity='0' />
        </linearGradient>
      </defs>
    </svg>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' />
      <path d='M9 18c-4.51 2-5-2-7-2' />
    </svg>
  );
}

export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d='M7 7h10v10' />
      <path d='M7 17 17 7' />
    </svg>
  );
}
