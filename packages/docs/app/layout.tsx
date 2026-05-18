import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ForgeWP — Framework Documentation",
  description:
    "Official developer reference manual for ForgeWP — the modern React-to-WordPress theme compiler. Covers all 6 phases: Foundation, Compiler Architecture, Component CLI, Data Layer, Gutenberg Blocks, and Page Templates.",
  keywords: ["ForgeWP", "WordPress", "React", "theme compiler", "Gutenberg blocks", "documentation"],
  openGraph: {
    title: "ForgeWP — Framework Documentation",
    description: "Build modern React-powered WordPress themes with the ForgeWP compiler framework.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
