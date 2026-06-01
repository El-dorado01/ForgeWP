// import { MiniHeader } from './MiniHeader'; // keep: temporarily hidden, uncomment <MiniHeader /> in SiteHeader JSX to restore
import { Navbar } from './Navbar';
import { Hydrate } from '@forgewp/react';

export function SiteHeader() {
  return (
    <header className="w-full sticky top-0 z-50">
      {/* MINI TOP HEADER — temporarily hidden (comment in to restore) */}
      {/* <MiniHeader /> */}

      {/* NAVBAR (Sticky, Hydrated) */}
      <Hydrate trigger="load" className="w-full">
        <Navbar />
      </Hydrate>
    </header>
  );
}

export default SiteHeader;
