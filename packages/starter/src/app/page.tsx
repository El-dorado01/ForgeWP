import type { CSSProperties, ReactNode } from "react";
import { Hydrate, WpHead } from "@forgewp/react";
import { ArrowUpRight, Github } from "lucide-react";
import { ForgeWPLogo, ReactLogo, ViteLogo } from "../components/brand-logos";
import { ThemeHotkey } from "../components/theme-hotkey";

export default function HomePage() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-hidden bg-[#0f1117] px-5 light:bg-[#f6f5f3] py-5 font-sans selection:bg-forgewp selection:text-white sm:px-10 sm:py-6 lg:px-16 lg:[@media(max-height:720px)]:py-4">
      <WpHead
        title="ForgeWP — React & Tailwind Compiler for WordPress"
        description="A premium developer framework for creating modern Gutenberg block-themes using React."
        ogType="website"
      />

      {/* Contour wave artwork, fading out toward the text */}
      <WaveLines className="forgewp-wave pointer-events-none absolute -right-24 top-16 -z-10 h-[440px] w-[460px] opacity-35 sm:-right-6 sm:top-20 sm:h-[600px] sm:w-[600px] sm:opacity-60 lg:-right-4 lg:top-[9%] lg:h-[96%] lg:w-[56%] lg:opacity-100" />

      {/* ── HEADER: ForgeWP | stack, centred ── */}
      <div className="flex items-center justify-center gap-5">
        <div className="flex items-center gap-2.5 select-none">
          <ForgeWPLogo className="h-6 w-auto text-stone-100 light:text-[#09090b]" />
          <span className="font-heading text-[21px] font-bold tracking-tight text-stone-100 light:text-slate-950">
            ForgeWP
          </span>
        </div>
        <span aria-hidden="true" className="h-7 w-px bg-[#3a3d45] light:bg-stone-300" />
        <div className="flex items-center gap-1.5">
          <LogoTile label="Vite">
            <ViteLogo className="h-[22px] w-[22px]" />
          </LogoTile>
          <span aria-hidden="true" className="font-mono text-[10px] text-stone-400">+</span>
          <LogoTile label="React">
            <ReactLogo className="h-[22px] w-[22px]" />
          </LogoTile>
        </div>
        {/* Press "d" to toggle dark mode */}
        <Hydrate id="theme-hotkey" trigger="load">
          <ThemeHotkey />
        </Hydrate>
      </div>

      {/* ── HERO ── */}
      <section className="flex flex-1 items-center py-10 lg:py-4 lg:[@media(max-height:720px)]:py-2">
        <div className="max-w-xl">
          <h1 className="mb-4 font-heading text-4xl font-bold leading-[1.02] tracking-tight text-stone-100 light:text-slate-950 sm:text-5xl xl:text-6xl lg:[@media(max-height:720px)]:mb-3 lg:[@media(max-height:720px)]:text-[44px]">
            React structure.
            <br />
            Tailwind speed.
            <br />
            <span className="text-forgewp">WordPress power.</span>
          </h1>

          <p className="mb-11 max-w-md text-sm leading-relaxed text-stone-400 light:text-stone-600 sm:text-[15px] lg:[@media(max-height:720px)]:mb-8 lg:[@media(max-height:720px)]:text-sm">
            Build your theme with React components, mock data and Tailwind. The
            ForgeWP compiler turns it into a standard WordPress theme with native
            Gutenberg blocks.
          </p>

          {/* CTAs match the forgewp.dev landing hero: tinted brand button + text link */}
          <div className="flex flex-wrap items-center gap-x-[26px] gap-y-4">
            <a
              href="https://forgewp.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-[4px] bg-[linear-gradient(110deg,color-mix(in_oklab,var(--color-forgewp)_10%,transparent),color-mix(in_oklab,#f59e0b_10%,transparent))] px-[22px] py-[14px] text-base font-semibold text-forgewp shadow-[0_1px_2px_#0000000d] transition-[background] duration-200 hover:bg-[linear-gradient(110deg,color-mix(in_oklab,var(--color-forgewp)_16%,transparent),color-mix(in_oklab,#f59e0b_16%,transparent))]"
            >
              Read the docs
            </a>
            <a
              href="https://github.com/forgewp/forgewp"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[11px] text-base text-stone-300 light:text-[#344154] transition-colors duration-200 hover:text-forgewp"
            >
              <Github size={16} />
              View on GitHub
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function LogoTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#2a2d35] bg-white light:border-stone-200"
    >
      {children}
    </div>
  );
}

/**
 * Flowing contour lines: each line falls from the top edge to the bottom edge and bends
 * around a shared fold. Dash length grows from left to right so the field reads as
 * dotted at the outer edge and solid near the fold. Computed at render time, so it
 * compiles to plain SVG in the exported theme.
 */
function WaveLines({ className }: { className?: string }) {
  const width = 600;
  const height = 640;
  const count = 11;
  const samples = 48;

  const lines = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 = outer (left) edge, 1 = fold
    const baseX = 330 + t * 340; // the fold and solid line run off the right edge
    const points: string[] = [];
    for (let s = 0; s <= samples; s++) {
      const v = s / samples; // 0 = top, 1 = bottom
      const y = v * (height + 40);
      // Fold bulges left through the middle and swings back near the bottom.
      const fold = Math.sin(v * Math.PI * 1.15 + 0.35) * (70 + t * 120);
      const ripple = Math.sin(v * Math.PI * 3 + t * 2.2) * (10 + t * 14);
      const x = baseX - fold * (0.35 + t * 0.65) + ripple;
      points.push(`${s === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return { d: points.join(""), t };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMaxYMin slice"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {lines.map(({ d, t }, i) => {
        const solid = i === count - 1; // the last line is solid; the 10 before it are dashed
        // Outer lines are dots (near-zero dash with round caps); dashes lengthen toward the fold.
        const dash = 0.01 + t * t * 9;
        const gap = 6 - t * 3.2;
        // Motion lives in globals.css (.forgewp-wave); these variables tune it per line.
        const motion = {
          "--wave-i": i,
          "--wave-period": (dash + gap).toFixed(2),
          "--wave-flow": `${((dash + gap) / 6).toFixed(2)}s`,
        } as CSSProperties;
        return (
          <path
            key={i}
            d={d}
            stroke={solid ? "#f97316" : "#18181b"}
            strokeWidth={solid ? 1.8 : 1.4 + t * 0.6}
            strokeLinecap="round"
            strokeDasharray={solid ? undefined : `${dash.toFixed(2)} ${gap.toFixed(2)}`}
            opacity={solid ? 0.9 : 0.18 + t * 0.62}
            data-solid={solid ? "" : undefined}
            style={motion}
          />
        );
      })}
    </svg>
  );
}
