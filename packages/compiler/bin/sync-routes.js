#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

console.log(`\n⚡ ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SITEMAP COMPILER (SYNC:ROUTES)  ")))}\n`);

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const isForce = args.includes("--force") || args.includes("--override");

// 1. Locate menus configuration file
let menusPath = path.join(projectRoot, "wordpress", "menus.json");
let menus = null;

if (!existsSync(menusPath)) {
  // Try fallback in mock-data.json
  const mockDataPath = path.join(projectRoot, "wordpress", "mock-data.json");
  if (existsSync(mockDataPath)) {
    try {
      const mockData = JSON.parse(readFileSync(mockDataPath, "utf8"));
      if (mockData.menu) {
        menus = mockData.menu;
        console.log(`  ℹ️  Using legacy menus block inside: wordpress/mock-data.json`);
      }
    } catch (e) {
      // Ignored
    }
  }
  
  if (!menus) {
    // Scaffold default menus.json
    menus = {
      primary: [
        { title: "Home", url: "/" },
        { title: "New", url: "/new" },
        { title: "Men", url: "/men" },
        { title: "Women", url: "/women" }
      ],
      utility: [
        { title: "Help", url: "/help" },
        { title: "Sign In", url: "/login" }
      ]
    };
    
    const dir = path.dirname(menusPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(menusPath, JSON.stringify(menus, null, 2), "utf8");
    console.log(`  🎉 ${pc.green("Created dedicated sitemap source")}: wordpress/menus.json`);
  }
} else {
  try {
    menus = JSON.parse(readFileSync(menusPath, "utf8"));
    console.log(`  📖 ${pc.green("Loaded sitemap source")}: wordpress/menus.json`);
  } catch (err) {
    console.error(pc.red(`\n❌ Error: Failed to parse wordpress/menus.json.\nReason: ${err.message}`));
    process.exit(1);
  }
}

// 2. Extract unique local paths and sanitize them
const routesToScaffold = [];
const seenUrls = new Set(["/", ""]);

for (const [location, items] of Object.entries(menus)) {
  if (!Array.isArray(items)) continue;
  for (const item of items) {
    if (!item.url || typeof item.url !== "string") continue;
    let url = item.url.trim();

    // Skip external, anchors, mailto, etc.
    if (
      url.startsWith("http://") || 
      url.startsWith("https://") || 
      url.startsWith("#") || 
      url.startsWith("mailto:") || 
      url.startsWith("tel:")
    ) {
      continue;
    }

    // Normalize starting slash
    if (!url.startsWith("/")) {
      url = "/" + url;
    }

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    routesToScaffold.push({
      path: url,
      title: item.title || url.replace("/", "")
    });
  }
}

if (routesToScaffold.length === 0) {
  console.log(pc.yellow(`\nℹ️ No local pages to synchronize inside your sitemap menu config.`));
  process.exit(0);
}

// Helper to convert path / slug to PascalCase ComponentName
function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("") + "Page";
}

// 3. Ensure Pages output directory exists
const pagesDir = path.join(projectRoot, "src", "app", "pages");
if (!existsSync(pagesDir)) {
  mkdirSync(pagesDir, { recursive: true });
}

// 4. Scaffold components non-destructively
let scaffoldedCount = 0;
let skippedCount = 0;

for (const route of routesToScaffold) {
  const componentName = toPascalCase(route.title);
  const componentPath = path.join(pagesDir, `${componentName}.tsx`);
  
  const componentContent = `import { SEO } from "../../.forgewp/SEO";
import { WpQueryLoop, useWpTitle, useWpExcerpt, useWpFeaturedImage } from "../../.forgewp/wordpress";

export function ${componentName}() {
  return (
    <main className="container mx-auto px-6 py-12">
      {/* Dynamic SEO Injector */}
      <SEO 
        title="${route.title}" 
        description="Explore our exclusive ${route.title} section, dynamically loaded in Headless React." 
      />

      {/* Hero Header Area */}
      <header className="border-b-4 border-black pb-6 mb-12">
        <h1 className="text-5xl font-black tracking-tight uppercase">${route.title}</h1>
        <p className="text-zinc-500 mt-2 text-lg">
          Auto-generated template. Edit <code className="bg-zinc-100 px-1 py-0.5 rounded text-sm text-red-600 font-mono">src/app/pages/${componentName}.tsx</code> to customize this page.
        </p>
      </header>

      {/* Grid Starter - WordPress Mock Loop */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <WpQueryLoop postType="post" postsPerPage={3}>
          <article className="border-2 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="w-full h-48 bg-zinc-100 mb-4 border border-zinc-200 overflow-hidden">
              <img 
                src={useWpFeaturedImage()} 
                alt={useWpTitle()} 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight mb-2">
              {useWpTitle()}
            </h2>
            <p className="text-zinc-600 text-sm mb-4">
              {useWpExcerpt()}
            </p>
            <a 
              href="#" 
              className="inline-block px-4 py-2 border-2 border-black bg-zinc-100 font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors"
            >
              Read More
            </a>
          </article>
        </WpQueryLoop>
      </section>
    </main>
  );
}
`;

  if (existsSync(componentPath) && !isForce) {
    console.log(`  ${pc.gray("ℹ️ [Skip] Component already exists:")} src/app/pages/${componentName}.tsx`);
    skippedCount++;
  } else {
    writeFileSync(componentPath, componentContent, "utf8");
    console.log(`  ${pc.green("✅ Scaffolded component")}: src/app/pages/${componentName}.tsx`);
    scaffoldedCount++;
  }
}

// 5. Inject pages into src/app/routes.tsx
const routesFilePath = path.join(projectRoot, "src/app/routes.tsx");
if (existsSync(routesFilePath)) {
  let routesContent = readFileSync(routesFilePath, "utf8");
  let modified = false;

  for (const route of routesToScaffold) {
    const componentName = toPascalCase(route.title);
    
    // Check if the component is imported
    const importRegex = new RegExp(`import\\s+\\{\\s*${componentName}\\s*\\}\\s+from\\s+["']\\./pages/${componentName}["']`);
    if (!importRegex.test(routesContent)) {
      // Find a clean place to inject imports
      // Right above "export default function" or under other imports
      const defaultExportIndex = routesContent.indexOf("export default function");
      if (defaultExportIndex !== -1) {
        routesContent = 
          routesContent.slice(0, defaultExportIndex) +
          `import { ${componentName} } from "./pages/${componentName}";\n` +
          routesContent.slice(defaultExportIndex);
        modified = true;
      }
    }

    // Check if the Route path is registered
    const routeRegex = new RegExp(`path\\s*=\\s*["']${route.path}["']`);
    if (!routeRegex.test(routesContent)) {
      // Find the fallback route or closing Switch tag to inject
      const fallbackMarker = "{/* Fallback route */}";
      const fallbackIndex = routesContent.indexOf(fallbackMarker);
      if (fallbackIndex !== -1) {
        routesContent = 
          routesContent.slice(0, fallbackIndex) +
          `<Route path="${route.path}" component={${componentName}} />\n\n      ` +
          routesContent.slice(fallbackIndex);
        modified = true;
      } else {
        // Fallback to closing Switch tag
        const switchCloseIndex = routesContent.indexOf("</Switch>");
        if (switchCloseIndex !== -1) {
          routesContent = 
            routesContent.slice(0, switchCloseIndex) +
            `  <Route path="${route.path}" component={${componentName}} />\n      ` +
            routesContent.slice(switchCloseIndex);
          modified = true;
        }
      }
    }
  }

  if (modified) {
    writeFileSync(routesFilePath, routesContent, "utf8");
    console.log(`  ${pc.green("✅ Synced routing paths in")}: src/app/routes.tsx`);
  } else {
    console.log(`  ${pc.gray("ℹ️  Routes are already fully up to date in")}: src/app/routes.tsx`);
  }
} else {
  console.log(pc.yellow(`  ⚠️  Warning: routes.tsx not found. Skipped route linking.`));
}

console.log("\n" + "─".repeat(60));
console.log(pc.green(`\n🎉 ${pc.bold("SITEMAP SYNC COMPLETE:")} Generated ${scaffoldedCount} new pages (skipped ${skippedCount}).\n`));
