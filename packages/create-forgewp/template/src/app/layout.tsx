import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useWpTitle } from "@/lib/wordpress";

export default function RootLayout({ children }: { children: ReactNode }) {
  const defaultTitle = useWpTitle();

  return (
    <div className="forgewp-root">
      <Helmet>
        <title>{defaultTitle}</title>
        {/* Add your default meta tags here */}
        <meta name="description" content="A WordPress theme built with ForgeWP" />
      </Helmet>
      {children}
    </div>
  );
}
