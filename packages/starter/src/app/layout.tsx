import type { ReactNode } from "react";
import { SEO } from "@/components/SEO";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="forgewp-root">
      {/* 
        Define default SEO settings here. 
        Individual pages can override them by rendering their own <SEO /> component.
      */}
      <SEO 
        description="A WordPress theme built with ForgeWP - React & Tailwind CSS"
        keywords="WordPress, React, Tailwind, ForgeWP"
      />
      {children}
    </div>
  );
}
