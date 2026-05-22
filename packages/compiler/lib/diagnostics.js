import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

/**
 * Run compiler diagnostics on compiled hydration islands.
 * @param {string} themeRoot
 * @param {Record<string, string>} mapping Kebab island name -> chunk file path
 * @returns {{ heavyCount: number, results: any[] }}
 */
export function analyzeHydrationIslands(themeRoot, mapping) {
  const results = [];
  let heavyCount = 0;

  for (const [islandName, chunkPath] of Object.entries(mapping)) {
    // Vite compiles into 'dist' folder
    const filePath = path.join(themeRoot, 'dist', chunkPath);
    if (fs.existsSync(filePath)) {
      const sizeBytes = fs.statSync(filePath).size;
      const sizeKb = sizeBytes / 1024;
      const isHeavy = sizeKb > 100;

      if (isHeavy) {
        heavyCount++;
      }

      results.push({
        name: islandName,
        sizeKb,
        isHeavy,
        chunkPath,
      });
    }
  }

  return {
    heavyCount,
    results,
  };
}

/**
 * Print a gorgeous CLI diagnostic report.
 * @param {{ heavyCount: number, results: any[] }} analysis
 */
export function printDiagnosticsReport(analysis) {
  console.log(`\n🩺 ${pc.bold(pc.bgCyan(pc.black("  FORGEWP HYDRATION DIAGNOSTICS  ")))}`);
  
  if (analysis.results.length === 0) {
    console.log(`  ${pc.dim("No active hydration islands detected in this project.")}`);
    console.log("─".repeat(60) + "\n");
    return;
  }

  for (const item of analysis.results) {
    const paddedName = item.name.padEnd(28, '.');
    const formattedSize = `${item.sizeKb.toFixed(1)} kB`;

    if (item.isHeavy) {
      console.log(`  ⚠️  ${pc.yellow(pc.bold(paddedName))} ${pc.red(pc.bold(formattedSize))} ${pc.bgRed(pc.black(" HEAVY "))}`);
      console.log(`     ${pc.dim("👉 Chunk Path:")} dist/${item.chunkPath}`);
      console.log(`     ${pc.dim("👉 Recommendations:")}`);
      console.log(`        1. Split static markup sections out of the component into static wrappers.`);
      console.log(`        2. Avoid heavy external packages inside the island (or lazy load them inside React).`);
      console.log(`        3. Switch to a non-blocking trigger strategy (e.g. trigger="interaction" or trigger="idle").`);
    } else {
      console.log(`  ✅ ${pc.green(paddedName)} ${pc.green(formattedSize)}`);
    }
  }

  console.log("─".repeat(60));
  if (analysis.heavyCount > 0) {
    console.log(`  ${pc.red(pc.bold("WARNING:"))} Found ${analysis.heavyCount} heavy interactive hydration island(s).`);
    console.log(`  💡 Keep JS bundles light. Modern Web Vitals rewards minimal runtime overhead!\n`);
  } else {
    console.log(`  ${pc.green(pc.bold("SYSTEM OPTIMIZED:"))} All interactive hydration islands are within healthy thresholds (<100 kB).\n`);
  }
}

/**
 * Generate visual dashboard HTML report and save it under .forgewp/analyzer/index.html.
 * @param {string} themeRoot
 * @param {{ heavyCount: number, results: any[] }} analysis
 * @param {any[]} islandsWithProps
 * @param {any} config
 * @returns {string} Path to the generated report
 */
export function generateVisualReport(themeRoot, analysis, islandsWithProps, config) {
  const islands = islandsWithProps.map((item) => {
    const analysisMatch = analysis.results.find((a) => a.name === item.name);
    return {
      ...item,
      sizeKb: analysisMatch ? analysisMatch.sizeKb : 0,
      isHeavy: analysisMatch ? analysisMatch.isHeavy : false,
      chunkPath: analysisMatch ? analysisMatch.chunkPath : null,
      compiled: !!analysisMatch,
    };
  });

  // Calculate dynamic performance score
  let score = 100;
  let totalJsKb = 0;
  
  for (const island of islands) {
    totalJsKb += island.sizeKb;
    if (island.isHeavy) {
      score -= 15;
    }
    if (island.trigger === "load") {
      score -= 10;
    }
    if (island.smartDiscovered) {
      score -= 5;
    }
  }

  const violations = analysis.violations || [];
  for (const v of violations) {
    if (v.type === "metadata") score -= 5;
    else if (v.type === "loop") score -= 15;
    else if (v.type === "url") score -= 3;
  }

  score -= Math.floor(totalJsKb / 10);
  score = Math.max(10, Math.min(100, score));

  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  const payload = {
    config: {
      name: config.name || "Unknown Theme",
      slug: config.slug || "unknown",
      version: config.version || "1.0.0",
    },
    score,
    grade,
    islands,
    violations,
  };

  const outDir = path.join(themeRoot, ".forgewp", "analyzer");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const htmlContent = ANALYZER_TEMPLATE.replace("__DATA_PLACEHOLDER__", () => JSON.stringify(payload));

  const reportPath = path.join(outDir, "index.html");
  fs.writeFileSync(reportPath, htmlContent, "utf8");

  return reportPath;
}

const ANALYZER_TEMPLATE = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ForgeWP Hydration Devtools & Analyzer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    if (typeof tailwind !== 'undefined') {
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            fontFamily: {
              sans: ['"Plus Jakarta Sans"', 'sans-serif'],
              mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
              brand: {
                DEFAULT: '#06b6d4',
                hover: '#0891b2',
              }
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #09090b;
      color: #fafafa;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #3f3f46;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(0.95); opacity: 0.5; }
    }
    .pulsing-dot::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      background: inherit;
      border-radius: inherit;
      animation: pulse-ring 2s infinite ease-in-out;
    }
  </style>
</head>
<body class="min-h-screen font-sans flex flex-col antialiased selection:bg-brand selection:text-black">
  <!-- Header -->
  <header class="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="relative w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold tracking-wider select-none shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        ⚡
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-zinc-100 uppercase">ForgeWP</h1>
        <p class="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">Hydration Devtools & Analyzer</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 relative pulsing-dot"></span>
        Local Dev Simulator
      </span>
      <button onclick="window.location.reload()" class="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors">
        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
      </button>
    </div>
  </header>

  <main class="flex-1 flex overflow-hidden">
    <!-- Left panel -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
      
      <!-- Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Performance Score -->
        <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Performance Score</span>
            <div class="text-2xl font-black mt-1" id="metric-score">--</div>
            <p class="text-[10px] text-zinc-400 mt-1" id="metric-score-text">Calculating Grade...</p>
          </div>
          <div class="w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border" id="score-badge">
            -
          </div>
        </div>

        <!-- Total JS Footprint -->
        <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total JS Payload</span>
            <div class="text-2xl font-black mt-1" id="metric-size">--</div>
            <p class="text-[10px] text-zinc-400 mt-1">Across all hydration islands</p>
          </div>
          <div class="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-zinc-400">
            <i data-lucide="file-code" class="w-6 h-6"></i>
          </div>
        </div>

        <!-- Total Islands Count -->
        <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Hydration Islands</span>
            <div class="text-2xl font-black mt-1" id="metric-count">--</div>
            <p class="text-[10px] text-zinc-400 mt-1" id="metric-unwrapped">0 unwrapped warning(s)</p>
          </div>
          <div class="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-zinc-400">
            <i data-lucide="layout-grid" class="w-6 h-6"></i>
          </div>
        </div>

        <!-- Average Island Size -->
        <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden flex items-center justify-between">
          <div>
            <span class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Average Island JS</span>
            <div class="text-2xl font-black mt-1" id="metric-avg">--</div>
            <p class="text-[10px] text-zinc-400 mt-1" id="metric-heavy">0 heavy island(s)</p>
          </div>
          <div class="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-zinc-400">
            <i data-lucide="bar-chart-2" class="w-6 h-6"></i>
          </div>
        </div>
      </div>

      <!-- Route Visual Map -->
      <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2 mb-6 select-none">
          <i data-lucide="network" class="w-4 h-4 text-cyan-400"></i>
          Interactive Hydration Graph
        </h2>
        
        <div class="border border-zinc-800/50 bg-zinc-950/40 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          
          <div class="flex flex-col items-center relative z-10 w-full">
            <div class="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)] select-none">
              <div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                <i data-lucide="layout" class="w-4 h-4"></i>
              </div>
              <div class="text-left">
                <div class="text-xs font-bold text-zinc-200">Main Site Template</div>
                <div class="text-[10px] text-zinc-500 font-mono">0 kB client JavaScript</div>
              </div>
              <span class="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold uppercase px-2 py-0.5 border border-emerald-500/20 rounded">Static HTML</span>
            </div>

            <div class="mt-12 flex flex-wrap justify-center gap-8 relative w-full" id="graph-islands-container">
            </div>
          </div>
        </div>
      </div>

      <!-- Static Code Analyzer & Theme Lint Rules -->
      <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center justify-between mb-6 select-none">
          <span class="flex items-center gap-2">
            <i data-lucide="shield-alert" class="w-4 h-4 text-cyan-400"></i>
            Theme Lint Rules & SEO Best Practices
          </span>
          <span class="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold" id="lint-status-badge">
            0 Violations
          </span>
        </h2>

        <div id="lint-passed-alert" class="hidden bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-4">
          <div class="p-2 bg-emerald-950/60 rounded-lg text-emerald-400">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-emerald-300">Pristine Architecture Audit</h4>
            <p class="text-zinc-400 text-[11px] leading-relaxed mt-1">All pages pass standard metadata requirements, static event handlers are correctly hydrated, and no hardcoded internal URLs were found. Excellent work!</p>
          </div>
        </div>

        <div id="lint-violations-container" class="space-y-4">
          <!-- Populated dynamically via JS -->
        </div>
      </div>

      <!-- Islands Table -->
      <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2 select-none">
            <i data-lucide="list" class="w-4 h-4 text-cyan-400"></i>
            Hydration Island Directory
          </h2>
          <div class="flex items-center gap-3">
            <input type="text" id="search-input" placeholder="Search islands..." class="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 text-zinc-300 w-48 font-medium">
            <select id="filter-type" class="bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 text-zinc-400 font-semibold">
              <option value="all">All Islands</option>
              <option value="heavy">Heavy (&gt;100 kB)</option>
              <option value="unwrapped">Unwrapped</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th class="pb-3">Component / Chunk</th>
                <th class="pb-3">Trigger Strategy</th>
                <th class="pb-3">Bundle Size</th>
                <th class="pb-3">Constraints</th>
                <th class="pb-3">Source File</th>
                <th class="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="islands-table-body" class="text-xs divide-y divide-zinc-800/50">
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right panel -->
    <div class="w-80 border-l border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
      <div class="space-y-6">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Selected Island</h2>
          <div id="no-island-selected" class="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 text-center text-zinc-500">
            <i data-lucide="info" class="w-8 h-8 mx-auto mb-2 text-zinc-600"></i>
            <p class="text-xs">Click on any island node or list item to view detailed diagnostics and optimization suggestions.</p>
          </div>

          <div id="island-details-card" class="hidden space-y-4">
            <div class="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-bold text-zinc-100 text-sm" id="details-name">Component</h3>
                  <p class="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[180px]" id="details-chunk">chunk-path</p>
                </div>
                <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded" id="details-size-badge">0 kB</span>
              </div>
              
              <div class="border-t border-zinc-800 pt-3 space-y-2 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-zinc-500 font-semibold">Trigger:</span>
                  <span class="text-zinc-300 font-mono font-bold" id="details-trigger">-</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-500 font-semibold">Preload Strategy:</span>
                  <span class="text-zinc-300 font-mono font-bold" id="details-preload">-</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-500 font-semibold">Media Query:</span>
                  <span class="text-zinc-300 font-mono font-bold" id="details-media">-</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-500 font-semibold">Connection Gating:</span>
                  <span class="text-zinc-300 font-mono font-bold" id="details-connection">-</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-zinc-500 font-semibold">Client Only:</span>
                  <span class="text-zinc-300 font-mono font-bold" id="details-client-only">-</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Optimization Roadmap</h4>
              <div class="bg-cyan-950/10 border border-cyan-900/30 rounded-xl p-5 space-y-3" id="optimization-container">
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-zinc-800 pt-6 mt-6">
        <div class="text-[10px] text-zinc-500 font-mono text-center">
          ForgeWP Theme Package: <span class="text-zinc-400" id="theme-slug">theme-slug</span> v<span class="text-zinc-400" id="theme-version">0.0.0</span>
        </div>
      </div>
    </div>
  </main>

  <script>
    const DATA = __DATA_PLACEHOLDER__;

    document.getElementById("theme-slug").textContent = DATA.config.slug;
    document.getElementById("theme-version").textContent = DATA.config.version;

    // Render Static Lint Rules
    var violations = DATA.violations || [];
    var lintStatusBadge = document.getElementById("lint-status-badge");
    var lintPassedAlert = document.getElementById("lint-passed-alert");
    var lintContainer = document.getElementById("lint-violations-container");

    lintStatusBadge.textContent = violations.length + " Violation(s)";
    
    if (violations.length === 0) {
      lintPassedAlert.classList.remove("hidden");
      lintStatusBadge.className = "text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold";
    } else {
      lintPassedAlert.classList.add("hidden");
      lintStatusBadge.className = "text-[10px] bg-rose-950/40 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold";
      
      violations.forEach(function(v) {
        var item = document.createElement("div");
        
        var colorClass = "border-zinc-800 bg-zinc-950/30";
        var icon = "alert-circle";
        var iconColor = "text-amber-500";
        var tag = "WARNING";
        var tagClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        
        if (v.severity === "error") {
          colorClass = "border-rose-900/30 bg-rose-950/5";
          icon = "x-circle";
          iconColor = "text-rose-500";
          tag = "CRITICAL ERROR";
          tagClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
        } else if (v.type === "metadata") {
          colorClass = "border-amber-900/30 bg-amber-950/5";
          icon = "globe";
          iconColor = "text-amber-500";
          tag = "SEO WARN";
          tagClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        } else if (v.type === "url") {
          colorClass = "border-cyan-900/30 bg-cyan-950/5";
          icon = "link-2";
          iconColor = "text-cyan-500";
          tag = "LINK WARN";
          tagClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
        }
        
        item.className = "border rounded-xl p-5 flex items-start gap-4 " + colorClass;
        
        var codeSnippet = "";
        if (v.lineContent) {
          codeSnippet = '<div class="mt-2.5 p-2 bg-zinc-950 border border-zinc-800 rounded font-mono text-[10px] text-zinc-400 select-text overflow-x-auto truncate max-w-full">' +
            v.lineContent +
          '</div>';
        }
        
        item.innerHTML = \`
          <div class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg \${iconColor}">
            <i data-lucide="\${icon}" class="w-5 h-5"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-mono font-bold uppercase px-2 py-0.5 border rounded \${tagClass}">
                \${tag}
              </span>
              <span class="text-[10px] text-zinc-500 font-mono">\${v.file}</span>
            </div>
            <h4 class="text-xs font-bold text-zinc-200 mt-2 select-text">\${v.message}</h4>
            \${codeSnippet}
          </div>
        \`;
        lintContainer.appendChild(item);
      });
    }

    const score = DATA.score;
    const scoreBadge = document.getElementById("score-badge");
    const metricScore = document.getElementById("metric-score");
    const metricScoreText = document.getElementById("metric-score-text");

    metricScore.textContent = score + "/100";
    scoreBadge.textContent = DATA.grade;

    if (score >= 90) {
      scoreBadge.className = "w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
      metricScoreText.textContent = "Optimal Performance Grade";
    } else if (score >= 80) {
      scoreBadge.className = "w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border bg-teal-950/40 border-teal-500/50 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]";
      metricScoreText.textContent = "Good Performance Grade";
    } else if (score >= 70) {
      scoreBadge.className = "w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border bg-amber-950/40 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
      metricScoreText.textContent = "Moderate Performance Grade";
    } else {
      scoreBadge.className = "w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border bg-rose-950/40 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]";
      metricScoreText.textContent = "Requires Optimization";
    }

    const totalJsKb = DATA.islands.reduce((acc, curr) => acc + curr.sizeKb, 0);
    document.getElementById("metric-size").textContent = totalJsKb.toFixed(1) + " kB";
    document.getElementById("metric-count").textContent = DATA.islands.length;

    const unwrappedCount = DATA.islands.filter(i => i.smartDiscovered).length;
    document.getElementById("metric-unwrapped").textContent = unwrappedCount + " unwrapped warning(s)";

    const heavyCount = DATA.islands.filter(i => i.isHeavy).length;
    document.getElementById("metric-heavy").textContent = heavyCount + " heavy island(s)";

    const avgSize = DATA.islands.length > 0 ? (totalJsKb / DATA.islands.length) : 0;
    document.getElementById("metric-avg").textContent = avgSize.toFixed(1) + " kB";

    let selectedIsland = null;
    function selectIsland(island) {
      selectedIsland = island;
      document.getElementById("no-island-selected").classList.add("hidden");
      const detailsCard = document.getElementById("island-details-card");
      detailsCard.classList.remove("hidden");

      document.getElementById("details-name").textContent = island.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
      document.getElementById("details-chunk").textContent = island.chunkPath ? \`dist/\${island.chunkPath}\` : "not compiled (static)";
      
      const sizeBadge = document.getElementById("details-size-badge");
      sizeBadge.textContent = island.sizeKb.toFixed(1) + " kB";
      if (island.isHeavy) {
        sizeBadge.className = "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-400";
      } else if (island.sizeKb > 50) {
        sizeBadge.className = "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-400";
      } else {
        sizeBadge.className = "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400";
      }

      document.getElementById("details-trigger").textContent = island.trigger;
      document.getElementById("details-preload").textContent = island.preload || "none";
      document.getElementById("details-media").textContent = island.media || "none";
      document.getElementById("details-connection").textContent = island.connection || "any";
      document.getElementById("details-client-only").textContent = island.clientOnly ? "true" : "false";

      const optContainer = document.getElementById("optimization-container");
      optContainer.innerHTML = "";

      const recommendations = [];
      if (island.smartDiscovered) {
        recommendations.push({
          title: "Wrap Component in <Hydrate>",
          text: \`This component was auto-detected because it uses interactive React hooks. Wrap it explicitly in <code>&lt;Hydrate trigger="..."&gt;</code> to manage when it activates.\`,
          icon: "alert-triangle",
          color: "text-amber-400"
        });
      }

      if (island.isHeavy) {
        recommendations.push({
          title: "Reduce Bundle Footprint",
          text: "This component is larger than 100 kB. Move non-interactive display panels to parent templates or code-split complex sub-libraries inside the component.",
          icon: "minimize-2",
          color: "text-rose-400"
        });
      }

      if (island.trigger === "load") {
        recommendations.push({
          title: "Avoid 'load' Hydration Trigger",
          text: "Hydrating on load blocks page interactivity metrics. Change to <code>trigger='visible'</code> or <code>trigger='interaction'</code> to boost performance scores.",
          icon: "zap-off",
          color: "text-amber-400"
        });
      }

      if (island.sizeKb > 30 && island.preload === "none" && island.trigger === "visible") {
        recommendations.push({
          title: "Enable Near-Visible Preloading",
          text: "Since this is a medium-sized island, set <code>preload='near-visible'</code> to pre-fetch the JS chunk right before the element intersects the viewport.",
          icon: "download",
          color: "text-cyan-400"
        });
      }

      if (recommendations.length === 0) {
        recommendations.push({
          title: "Optimal Configuration",
          text: "This hydration island is fully optimized! Keep the size light and triggers non-blocking.",
          icon: "check-circle",
          color: "text-emerald-400"
        });
      }

      recommendations.forEach(r => {
        const div = document.createElement("div");
        div.className = "flex gap-3 text-xs";
        div.innerHTML = \`
          <div class="mt-0.5 \${r.color}"><i data-lucide="\${r.icon}" class="w-4 h-4"></i></div>
          <div>
            <h5 class="font-bold text-zinc-200">\${r.title}</h5>
            <p class="text-zinc-400 text-[11px] leading-relaxed mt-1">\${r.text}</p>
          </div>
        \`;
        optContainer.appendChild(div);
      });
      if (typeof lucide !== "undefined") {
        try { lucide.createIcons(); } catch (e) {}
      }
    }

    const container = document.getElementById("graph-islands-container");
    DATA.islands.forEach(island => {
      const card = document.createElement("div");
      
      let borderClass = "border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-900/60";
      let dotColor = "bg-emerald-500";

      if (island.smartDiscovered) {
        borderClass = "border-dashed border-amber-600/50 hover:border-amber-500 text-amber-200 bg-amber-950/10";
        dotColor = "bg-amber-500";
      } else if (island.isHeavy) {
        borderClass = "border-rose-500/50 hover:border-rose-400 text-rose-200 bg-rose-950/10";
        dotColor = "bg-rose-500";
      } else if (island.sizeKb > 50) {
        borderClass = "border-amber-500/40 hover:border-amber-400 text-amber-100 bg-amber-950/5";
        dotColor = "bg-amber-400";
      }

      const compTitle = island.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

      card.className = \`cursor-pointer transition-all hover:scale-[1.02] border rounded-xl p-4 flex flex-col items-start gap-2 min-w-[160px] shadow-lg select-none relative \${borderClass}\`;
      card.innerHTML = \`
        <div class="flex items-center justify-between w-full">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-zinc-400">
            <span class="w-1.5 h-1.5 rounded-full \${dotColor}"></span>
            \${island.sizeKb.toFixed(1)} kB
          </span>
          \${island.smartDiscovered ? '<span class="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-mono font-bold uppercase">Unwrapped</span>' : ''}
        </div>
        <div class="text-xs font-bold text-zinc-200 mt-1">\${compTitle}</div>
        <div class="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 mt-0.5">
          <i data-lucide="zap" class="w-3 h-3 text-cyan-500"></i>
          trigger="\${island.trigger}"
        </div>
      \`;
      card.onclick = () => selectIsland(island);
      container.appendChild(card);
    });

    const tableBody = document.getElementById("islands-table-body");
    function renderTable(filterQuery = "", filterType = "all") {
      tableBody.innerHTML = "";
      
      const filtered = DATA.islands.filter(island => {
        const matchesQuery = island.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
                             island.file.toLowerCase().includes(filterQuery.toLowerCase());
        
        if (filterType === "heavy") {
          return matchesQuery && island.isHeavy;
        }
        if (filterType === "unwrapped") {
          return matchesQuery && island.smartDiscovered;
        }
        return matchesQuery;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = \`
          <tr>
            <td colspan="6" class="py-8 text-center text-zinc-500 font-medium">
              No matching hydration islands found.
            </td>
          </tr>
        \`;
        return;
      }

      filtered.forEach(island => {
        const row = document.createElement("tr");
        row.className = "hover:bg-zinc-900/30 transition-colors group cursor-pointer";
        
        let sizeBadgeClass = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
        if (island.isHeavy) {
          sizeBadgeClass = "text-rose-400 bg-rose-500/5 border-rose-500/10";
        } else if (island.sizeKb > 50) {
          sizeBadgeClass = "text-amber-400 bg-amber-500/5 border-amber-500/10";
        }

        const compTitle = island.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

        row.innerHTML = \`
          <td class="py-3.5 font-bold text-zinc-200">
            \${compTitle}
            <div class="text-[9px] text-zinc-500 font-mono font-normal mt-0.5">\${island.name}</div>
          </td>
          <td class="py-3.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
              \${island.trigger}
            </span>
          </td>
          <td class="py-3.5">
            <span class="inline-flex px-2 py-0.5 rounded border text-[10px] font-mono font-bold \${sizeBadgeClass}">
              \${island.sizeKb.toFixed(1)} kB
            </span>
          </td>
          <td class="py-3.5 font-mono text-[10px] text-zinc-400">
            \${island.media ? 'media: ' + island.media : ''}
            \${island.connection !== 'any' ? 'connection: ' + island.connection : ''}
            \${(!island.media && island.connection === 'any') ? 'none' : ''}
          </td>
          <td class="py-3.5 font-mono text-[10px] text-zinc-500">
            \${island.file}
          </td>
          <td class="py-3.5 text-right">
            <button class="opacity-0 group-hover:opacity-100 text-cyan-400 hover:text-cyan-300 transition-all font-semibold inline-flex items-center gap-1">
              Analyze <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        \`;
        row.onclick = () => selectIsland(island);
        tableBody.appendChild(row);
      });
      if (typeof lucide !== "undefined") {
        try { lucide.createIcons(); } catch (e) {}
      }
    }

    const searchInput = document.getElementById("search-input");
    const filterType = document.getElementById("filter-type");

    searchInput.addEventListener("input", (e) => {
      renderTable(e.target.value, filterType.value);
    });

    filterType.addEventListener("change", (e) => {
      renderTable(searchInput.value, e.target.value);
    });

    renderTable();
    if (typeof lucide !== "undefined") {
      try { lucide.createIcons(); } catch (e) {}
    }

    if (DATA.islands.length > 0) {
      selectIsland(DATA.islands[0]);
    }
  </script>
</body>
</html>`;

