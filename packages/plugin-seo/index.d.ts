import { ForgeWPPlugin, ForgeWpSeoSitemapsConfig } from '@forgewp/compiler';

export interface SeoPluginOptions {
  favicon?: string;
  sitemaps?: ForgeWpSeoSitemapsConfig;
  plugins?: {
    yoast?: boolean;
    rankMath?: boolean;
  };
}

export default function seoPlugin(options?: SeoPluginOptions): ForgeWPPlugin;
