import { MiniHeader } from './MiniHeader';
import { Navbar } from './Navbar';
import { Hydrate } from '@forgewp/react';

export function SiteHeader() {
  return (
    <>
      {/* MINI TOP HEADER (Static, scrolls out) */}
      <MiniHeader />

      {/* NAVBAR (Sticky, Hydrated) */}
      <Hydrate trigger="load" className="sticky top-0 z-50 w-full">
        <Navbar />
      </Hydrate>
    </>
  );
}

export default SiteHeader;
