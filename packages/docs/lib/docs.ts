import { readFileSync, existsSync } from "fs";
import path from "path";

export interface DocSection {
  id: string;
  title: string;
  phase: string;
  category: string;
  content: string;
  steps?: { title: string; desc: string }[];
}

export function getDocs(): DocSection[] {
  const sections: DocSection[] = [];
  const baseDir = path.resolve(process.cwd(), "../../");

  const files = [
    { name: "forgewp-docs.md", defaultCategory: "Core" },
    { name: "forgewp_animation_architecture_and_performance_docs.md", defaultCategory: "Performance" },
    { name: "forgewp_motion_integration_spec.md", defaultCategory: "Spec" }
  ];

  for (const file of files) {
    const fullPath = path.join(baseDir, file.name);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf8");
    // Parse by H1 or H2 sections
    const lines = content.split("\n");
    let currentSection: DocSection | null = null;
    let sectionContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match # Phase 1 — Foundation Architecture or similar
      const phaseMatch = line.match(/^#\s+(Phase\s+\d+\s+—\s+[^#\n]+)/i);
      const generalHeaderMatch = line.match(/^#\s+([^#\n]+)/);

      if (phaseMatch || generalHeaderMatch) {
        if (currentSection) {
          currentSection.content = sectionContent.join("\n").trim();
          sections.push(currentSection);
        }

        const title = phaseMatch ? phaseMatch[1] : generalHeaderMatch![1];
        const isPhase = title.toLowerCase().includes("phase");
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        currentSection = {
          id,
          title,
          phase: isPhase ? title.split("—")[0].trim() : "Overview",
          category: file.defaultCategory,
          content: ""
        };
        sectionContent = [];
      } else {
        if (currentSection) {
          sectionContent.push(line);
        }
      }
    }

    if (currentSection) {
      currentSection.content = sectionContent.join("\n").trim();
      sections.push(currentSection);
    }
  }

  // Fallback if no sections parsed
  if (sections.length === 0) {
    sections.push({
      id: "introduction",
      title: "ForgeWP Overview",
      phase: "Overview",
      category: "Core",
      content: "# Welcome to ForgeWP\n\nConfigure your workspace and start building modern React themes for WordPress!"
    });
  }

  return sections;
}
