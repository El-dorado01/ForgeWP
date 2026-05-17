/**
 * ForgeWP Mock Data Hooks
 * 
 * These hooks provide mock data during local development with Vite.
 * When compiled for production, they inject specific tokens that the
 * ForgeWP compiler replaces with actual WordPress PHP functions.
 */
import React from "react";

export function useWpTitle() {
  // @ts-ignore - Vite env variable
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return "Sample WordPress Title";
  }
  return "__FORGEWP_THE_TITLE__";
}

export function useWpContent() {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return "<p>This is a sample post content. It is rendered locally for development purposes to help you design your theme. In WordPress, this will be replaced by the actual post content from the Gutenberg editor.</p>";
  }
  return "__FORGEWP_THE_CONTENT__";
}

export function useWpPermalink() {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return "#";
  }
  return "__FORGEWP_THE_PERMALINK__";
}

export function useWpExcerpt() {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return "This is a short sample excerpt summarizing the post. It gives readers a quick preview of what to expect.";
  }
  return "__FORGEWP_THE_EXCERPT__";
}

export function WpLoop({ children }: { children: React.ReactNode }) {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    // Render 3 dummy posts locally so the developer can see the grid/list layout
    return (
      <>
        {children}
        {children}
        {children}
      </>
    );
  }

  // In production, we emit custom tags that the compiler replaces with the PHP while loop
  return (
    <>
      {/* @ts-ignore - Custom elements used as compiler tokens */}
      <forgewp-loop-start />
      {children}
      {/* @ts-ignore */}
      <forgewp-loop-end />
    </>
  );
}
