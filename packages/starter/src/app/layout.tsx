import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="forgewp-root">
      {children}
    </div>
  );
}
