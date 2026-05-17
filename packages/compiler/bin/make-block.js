#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

const args = process.argv.slice(2);
let rawBlockName = args.find(a => !a.startsWith("-"));

// Support --name TestimonialBlock or --name=TestimonialBlock
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawBlockName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawBlockName = nameEqual.split("=")[1];
  }
}

if (!rawBlockName) {
  console.error(pc.red("\n❌ Error: Please specify a block name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:block TestimonialBlock"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:block --name TestimonialBlock\n"));
  process.exit(1);
}

// 1. Sanitize & convert to PascalCase and kebab-case
const cleanName = rawBlockName.replace(/[^a-zA-Z0-9_-]/g, "");
if (!cleanName) {
  console.error(pc.red("\n❌ Error: Invalid block name. Use letters, numbers, dashes, and underscores.\n"));
  process.exit(1);
}

// Convert to PascalCase: e.g., testimonial-block -> TestimonialBlock
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

// Convert to Gutenberg Title: e.g., TestimonialBlock -> Testimonial Block
const readableTitle = pascalCase
  .replace(/([A-Z])/g, " $1")
  .trim();

// Ensure we are inside a ForgeWP theme workspace
const projectRoot = process.cwd();
const blocksDir = path.join(projectRoot, "src", "blocks");

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

// Ensure src/blocks directory exists
if (!existsSync(blocksDir)) {
  mkdirSync(blocksDir, { recursive: true });
}

const targetFile = path.join(blocksDir, `${pascalCase}.tsx`);

if (existsSync(targetFile)) {
  console.error(pc.red(`\n❌ Error: Block "${pascalCase}.tsx" already exists at src/blocks/\n`));
  process.exit(1);
}

// 2. Generate the beautiful Neo-Brutalist React block template
const blockTemplate = `export default function ${pascalCase}({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 bg-white border-4 border-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none my-6 selection:bg-brand selection:text-white">
      <span className="inline-block bg-brand text-white text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 mb-3 border-2 border-zinc-950">
        Gutenberg Custom Block
      </span>
      <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight leading-none mb-3">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 font-medium font-sans leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export const settings = {
  title: "Sharp ${readableTitle}",
  icon: "admin-post", // Choose icons from: https://developer.wordpress.org/resource/dashicons/
  category: "design",
  attributes: {
    title: { type: "string", default: "Enter Title Content Here" },
    description: { type: "string", default: "Enter a detailed description to display inside this dynamic Neo-Brutalist layout." }
  }
};
`;

// 3. Write template out to disk
writeFileSync(targetFile, blockTemplate, "utf8");

console.log(pc.green(`\n⚡ Block "${pascalCase}" successfully created!`));
console.log(`   Location: ${pc.cyan(`src/blocks/${pascalCase}.tsx`)}`);
console.log(`   Gutenberg Title: ${pc.yellow(`Sharp ${readableTitle}`)}`);
console.log(`\n🎉 Run ${pc.cyan("pnpm export")} to automatically register it inside your WordPress theme!\n`);
