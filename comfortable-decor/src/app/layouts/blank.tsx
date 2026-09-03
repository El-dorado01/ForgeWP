import type { ReactNode } from 'react';

export default function BlankLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-screen">{children}</main>;
}
