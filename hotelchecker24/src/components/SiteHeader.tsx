import { MiniHeader } from './MiniHeader';
import { Navbar } from './Navbar';
import { Hydrate } from '@forgewp/react';

export function SiteHeader() {
  return (
    <header className="w-full sticky top-[-36px] sm:top-[-37px] z-50">
      {/* MINI TOP HEADER (Static, scrolls out) */}
      <MiniHeader />

      {/* NAVBAR (Sticky, Hydrated) */}
      <Hydrate trigger="load" className="w-full">
        <Navbar />
      </Hydrate>
    </header>
  );
}

export default SiteHeader;
