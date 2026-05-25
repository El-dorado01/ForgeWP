/**
 * ⚡ Auto-Generated CPT Single Page Component by ForgeWP
 * 
 * This file was generated automatically for the custom post type "attachment".
 * You can safely edit this file to customize the visual layout, styles, and custom fields.
 * Subsequent runs of 'pnpm forgewp sync:routes' will NOT overwrite your changes.
 * 
 * To force reset this page back to boilerplate defaults, run:
 * 'pnpm forgewp sync:routes --force'
 */
import { useRoute } from "wouter";
import { 
  WpHead, 
  WpLink, 
  useWpQuery, 
  useWpTitle, 
  useWpContent, 
  useWpExcerpt, 
  useWpFeaturedImage, 
  useWpCustomField 
} from "../../.forgewp/wordpress";
import { ArrowLeft } from "lucide-react";

export function SingleAttachmentPage() {
  const [, params] = useRoute("/attachment/:id");
  const routeParam = params?.id;

  // In production, forgeWpHydration.currentPostId holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? (window as any).forgeWpHydration?.currentPostId || 0
      : 0;
  const id = hydrationId || routeParam;

  // Local development mock query for single attachment
  const { posts } = useWpQuery({
    postType: "attachment",
    postsPerPage: 100,
  });

  const devPost = posts.find(
    (p) => p.id === Number(id) || p.id === Number(hydrationId)
  );

  // Isomorphic dynamic mapping (compiles directly to WP loops in production)
  const title = useWpTitle() || devPost?.title || "Details";
  const content =
    useWpContent() || devPost?.content || "<p>Loading details...</p>";
  const rawImage = useWpFeaturedImage();
  const hydrationImage =
    typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime
      ? (window as any).forgeWpHydration?.currentFeaturedImage || ""
      : "";
  const restImage =
    typeof devPost?.featuredImage === "object" && devPost?.featuredImage !== null
      ? (devPost.featuredImage as any).url || ""
      : String(devPost?.featuredImage || "");
  const featuredImage = restImage || hydrationImage || rawImage || "https://picsum.photos/seed/forgewp/1200/630";

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <WpHead 
        title={title} 
        description="Dynamic single CPT details, loaded dynamically inside Headless React." 
      />

      <div className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl p-8 sm:p-12">
        {/* Back Button */}
        <WpLink 
          href="/attachments" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </WpLink>

        {/* Hero image */}
        {featuredImage && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-100 mb-8">
            <img 
              src={featuredImage} 
              alt={title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 uppercase mb-6 leading-tight">
          {title}
        </h1>

        {/* Content */}
        <div 
          className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </main>
  );
}
