#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

const args = process.argv.slice(2);
let rawComponentName = args.find(a => !a.startsWith("-"));

// Support --name PortfolioGrid or --name=PortfolioGrid
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawComponentName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawComponentName = nameEqual.split("=")[1];
  }
}

if (!rawComponentName) {
  console.error(pc.red("\n❌ Error: Please specify a component name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:component PortfolioGrid --postType=portfolio"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:component --name PortfolioGrid --postType=portfolio\n"));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawComponentName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(pc.red("\n❌ Error: Invalid component name.\n"));
  process.exit(1);
}

// Parse postType
let postType = "post";
const postTypeArg = args.find(a => a.startsWith("--postType=") || a.startsWith("--post-type="));
if (postTypeArg) {
  postType = postTypeArg.split("=")[1];
} else {
  const postTypeIndex = args.findIndex(a => a === "--postType" || a === "--post-type");
  if (postTypeIndex !== -1 && args[postTypeIndex + 1]) {
    postType = args[postTypeIndex + 1];
  }
}

const projectRoot = process.cwd();
const componentsDir = path.join(projectRoot, "src", "components");
const mockDataPath = path.join(projectRoot, "wordpress", "mock-data.json");

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

// Ensure src/components directory exists
if (!existsSync(componentsDir)) {
  mkdirSync(componentsDir, { recursive: true });
}

const targetFile = path.join(componentsDir, `${pascalCase}.tsx`);

if (existsSync(targetFile)) {
  console.error(pc.red(`\n❌ Error: Component "${pascalCase}.tsx" already exists at src/components/\n`));
  process.exit(1);
}

// Try to load custom fields from mock-data.json for this post type
let customFields = [];
let automaticallySeeded = false;

if (existsSync(mockDataPath)) {
  try {
    const mockData = JSON.parse(readFileSync(mockDataPath, "utf8"));
    if (!mockData[postType]) {
      // SMART ACTION: Automatically register and seed postType records in the JSON database
      mockData[postType] = [
        {
          id: 1,
          title: `Sample ${postType.charAt(0).toUpperCase() + postType.slice(1)} Item 1`,
          excerpt: `This is a custom ${postType} post seeded dynamically via ForgeWP CLI.`,
          content: `<p>Welcome to your new custom <strong>${postType}</strong> post template! Edit this in wordpress/mock-data.json.</p>`,
          date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          author: "ForgeWP CLI",
          featuredImage: `https://picsum.photos/seed/${postType}1/1200/630`,
          customFields: {
            client_name: "Mock Enterprise",
            project_budget: "$30,000",
          }
        },
        {
          id: 2,
          title: `Sample ${postType.charAt(0).toUpperCase() + postType.slice(1)} Item 2`,
          excerpt: `This is another custom ${postType} post seeded dynamically via ForgeWP CLI.`,
          content: `<p>This is the second custom post for the ${postType} post type.</p>`,
          date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          author: "ForgeWP CLI",
          featuredImage: `https://picsum.photos/seed/${postType}2/1200/630`,
          customFields: {
            client_name: "Mock Organization",
            project_budget: "$55,000",
          }
        }
      ];
      // Save updated JSON
      writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2), "utf8");
      automaticallySeeded = true;
    }

    const records = mockData[postType] || [];
    if (records.length > 0 && records[0].customFields) {
      customFields = Object.keys(records[0].customFields);
    }
  } catch (err) {
    // Ignore and fallback
  }
}

// Generate dynamic JSX elements for custom fields
let customFieldsMarkup = "";
if (customFields.length > 0) {
  customFieldsMarkup = customFields.map(f => {
    const cleanLabel = f.replace(/_/g, " ").replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());
    return `<div className="flex justify-between border-t border-zinc-950 pt-2 text-xs font-mono text-zinc-700">
              <span>${cleanLabel}:</span>
              <span className="font-bold">{useWpCustomField("${f}")}</span>
            </div>`;
  }).join("\n            ");
} else {
  customFieldsMarkup = `{/* No custom fields registered in mock-data.json. Add fields by running forgewp make:post-type */}
            <p className="text-xs text-zinc-500 font-mono italic">No custom fields configured for post type: ${postType}</p>`;
}

// Generate beautiful Brutalist post loop grid template
const componentTemplate = `import { WpQueryLoop, useWpTitle, useWpFeaturedImage, useWpExcerpt, useWpPermalink, useWpCustomField } from "@/lib/wordpress";

export default function ${pascalCase}() {
  return (
    <section className="py-12 bg-zinc-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 border-b-4 border-zinc-950 pb-4">
          <h2 className="text-4xl font-black uppercase tracking-tight text-zinc-950">
            Latest ${postType.charAt(0).toUpperCase() + postType.slice(1)} Items
          </h2>
          <p className="text-sm font-mono font-medium text-zinc-600 mt-1">
            Dynamic Post Type Loop Component — Querying "${postType}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <WpQueryLoop postType="${postType}" postsPerPage={3}>
            <article className="bg-white border-4 border-zinc-950 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <div>
                <div className="relative aspect-video w-full border-2 border-zinc-950 overflow-hidden mb-4 bg-zinc-100">
                  <img 
                    src={useWpFeaturedImage()} 
                    alt={useWpTitle()} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight leading-none mb-3 hover:text-brand transition-colors">
                  <a href={useWpPermalink()}>{useWpTitle()}</a>
                </h3>
                <p className="text-sm text-zinc-600 font-sans leading-relaxed mb-6">
                  {useWpExcerpt()}
                </p>
              </div>

              <div className="space-y-2 mt-auto">
            ${customFieldsMarkup}
              </div>
            </article>
          </WpQueryLoop>
        </div>
      </div>
    </section>
  );
}
`;

// Write template to file
writeFileSync(targetFile, componentTemplate, "utf8");

if (automaticallySeeded) {
  console.log(pc.yellow(`\n⚠️  Post type "${postType}" was missing from local database (mock-data.json).`));
  console.log(`   We have automatically registered it and seeded default custom fields for you!`);
}

console.log(pc.green(`\n⚡ Loop Component "${pascalCase}" successfully created!`));
console.log(`   Location: ${pc.cyan(`src/components/${pascalCase}.tsx`)}`);
console.log(`   Target Post Type: ${pc.yellow(postType)}`);
if (customFields.length > 0) {
  console.log(`   Seeded Custom Fields: ${pc.yellow(customFields.join(", "))}`);
}
console.log(`\n🎉 You can now import it directly inside your pages:`);
console.log(`   ${pc.cyan(`import ${pascalCase} from "@/components/${pascalCase}";`)}\n`);
