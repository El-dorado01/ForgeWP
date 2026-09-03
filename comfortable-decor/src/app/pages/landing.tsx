import { Link, WpHead } from '@forgewp/react';

export const pageConfig = {
  layout: 'blank',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#181816] text-cream flex flex-col items-center justify-center p-8 text-center">
      <WpHead
        title="Exclusive Architecture Drop — Comfortable Decor"
        description="A minimal landing page demonstrating distraction-free blank layout support in ForgeWP."
      />
      <div className="max-w-xl space-y-6">
        <span className="font-mono text-xs uppercase tracking-widest text-cream/60">
          (00) // Standalone Blank Layout
        </span>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">
          Distraction-Free Landing Experience
        </h1>
        <p className="text-sm sm:text-base text-cream/70 font-light leading-relaxed">
          This page declared <code className="bg-cream/10 px-2 py-1 rounded font-mono text-xs text-cream">export const pageConfig = &#123; layout: 'blank' &#125;</code>.
          The standard WordPress header and footer are automatically excluded, giving you a 100% custom canvas.
        </p>
        <div className="pt-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-cream text-ink px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold hover:bg-white transition-all shadow-xl"
          >
            Return to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
