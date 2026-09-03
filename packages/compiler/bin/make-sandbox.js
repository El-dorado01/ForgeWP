#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { addComponent } from "../lib/add-component.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const type = args[0];

if (!type || (type !== "ecommerce" && type !== "auth")) {
  console.error(pc.red(`\n❌ Error: Please specify sandbox type: "ecommerce" or "auth"`));
  console.log(`   Usage: pnpm forgewp make:sandbox <ecommerce|auth>\n`);
  process.exit(1);
}

const projectRoot = process.cwd();
const wpDir = path.join(projectRoot, "cms");

// Ensure cms directory exists
if (!wpDir) {
  // satisfied compiler check
}
if (!existsSync(wpDir)) {
  mkdirSync(wpDir, { recursive: true });
}

if (type === "ecommerce") {
  const packageJsonPath = path.join(projectRoot, "package.json");
  let packageJson = {};
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    } catch (e) {}
  }

  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const hasWooDependency = dependencies["@forgewp/woocommerce"] || devDependencies["@forgewp/woocommerce"];

  if (!hasWooDependency) {
    console.log(pc.yellow(`\nℹ️  To seed an e-commerce sandbox, the "@forgewp/woocommerce" package is required.`));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\n   Would you like to install "@forgewp/woocommerce" and configure e-commerce support? (y/N): `, (answer) => {
      rl.close();
      const confirmed = answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
      if (!confirmed) {
        console.log(pc.red(`\n❌ Aborted: E-commerce sandbox requires "@forgewp/woocommerce" dependency.\n`));
        process.exit(1);
      }

      // 1. Add dependency to package.json
      const isWorkspace = existsSync(path.join(projectRoot, "..", "..", "pnpm-workspace.yaml")) || existsSync(path.join(projectRoot, "..", "pnpm-workspace.yaml"));
      const versionToUse = isWorkspace ? "workspace:*" : "^0.4.2";

      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      packageJson.dependencies["@forgewp/woocommerce"] = versionToUse;
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
      console.log(pc.green(`  ✅ Added "@forgewp/woocommerce": "${versionToUse}" to package.json`));

      // 2. Detect package manager and install
      let packageManager = "npm";
      if (existsSync(path.join(projectRoot, "pnpm-lock.yaml")) || existsSync(path.join(projectRoot, "..", "pnpm-lock.yaml"))) {
        packageManager = "pnpm";
      } else if (existsSync(path.join(projectRoot, "yarn.lock"))) {
        packageManager = "yarn";
      } else if (existsSync(path.join(projectRoot, "bun.lockb"))) {
        packageManager = "bun";
      }

      console.log(pc.cyan(`  📦 Installing dependencies using ${packageManager}...`));

      const spawnResult = spawnSync(packageManager, ["install"], {
        stdio: "inherit",
        shell: process.platform === "win32"
      });

      if (spawnResult.status !== 0) {
        console.error(pc.red(`\n❌ Error: Failed to run "${packageManager} install". Please run it manually.`));
        process.exit(1);
      }

      console.log(pc.green(`  ✅ Package installation complete.`));

      // 3. Run repair / blueprint healing silently to make sure wordpress.tsx and products.json are written
      console.log(pc.cyan(`  🔧 Configuring system blueprints and updating wordpress.tsx...`));

      const repairScript = path.join(__dirname, "repair.js");
      const repairResult = spawnSync("node", [repairScript], {
        stdio: "ignore",
        shell: process.platform === "win32"
      });

      if (repairResult.status !== 0) {
        console.error(pc.red(`\n❌ Error: Failed to repair system blueprints.`));
        process.exit(1);
      }

      console.log(pc.green(`  ✅ Blueprints healed successfully.`));

      // Proceed to seed
      seedEcommerceData();
    });
  } else {
    // Proceed to seed directly
    seedEcommerceData();
  }
}

function seedEcommerceData() {
  const productsTsPath = path.join(wpDir, "products.ts");
  if (existsSync(productsTsPath)) {
    console.warn(pc.yellow(`\n⚠️  E-Commerce mock data already exists in cms/products.ts.`));
    console.log(`   You can open the file directly to view or edit existing mock products.\n`);
    return;
  }

  const productsPath = path.join(wpDir, "products.json");
  let productsData = {
    "product": [],
    "_taxonomy_product_cat": [],
    "_taxonomy_product_tag": []
  };

  if (existsSync(productsPath)) {
    try {
      productsData = JSON.parse(readFileSync(productsPath, "utf8"));
    } catch (err) {
      console.error(pc.red(`\n❌ Error: Failed to parse cms/products.json. Overwriting with clean structure.`));
      productsData = {
        "product": [],
        "_taxonomy_product_cat": [],
        "_taxonomy_product_tag": []
      };
    }
  }

  if (productsData["product"] && productsData["product"].length > 0) {
    console.warn(pc.yellow(`\n⚠️  E-Commerce mock data already exists in cms/products.json.`));
    console.log(`   You can open the file directly to view or edit existing mock products.\n`);
    return;
  }

  // Seed Taxonomy Categories
  const seededCategories = [
    { "id": 1, "name": "Apparel", "slug": "apparel", "description": "High-contrast streetwear and caps", "count": 2, "meta": {} },
    { "id": 2, "name": "Brutalist Design", "slug": "brutalist", "description": "Raw concrete design prints and books", "count": 2, "meta": {} },
    { "id": 3, "name": "Digital Art", "slug": "digital", "description": "Digital downloadable prints", "count": 1, "meta": {} }
  ];

  // Seed Taxonomy Tags
  const seededTags = [
    { "id": 10, "name": "Hoodie", "slug": "hoodie", "count": 1, "meta": {} },
    { "id": 11, "name": "T-Shirt", "slug": "t-shirt", "count": 1, "meta": {} },
    { "id": 12, "name": "Print", "slug": "print", "count": 1, "meta": {} }
  ];

  productsData["_taxonomy_product_cat"] = seededCategories;
  productsData["_taxonomy_product_tag"] = seededTags;

  productsData["product"] = [
    {
      "id": 101,
      "type": "simple",
      "title": "Minimalist Brutalist Hoodie",
      "excerpt": "A heavy-weight, raw-seam hoodie featuring high-contrast brutalist typesetting.",
      "content": "<p>Crafted from 450gsm organic cotton, this hoodie features zero border-radius drawcord tabs and structural double-stitch seams. Built for longevity and stark visual presence.</p>",
      "price": "49.99",
      "regular_price": "59.99",
      "on_sale": true,
      "sku": "FWP-BRUT-01",
      "stock_status": "instock",
      "featuredImage": "https://picsum.photos/seed/hoodie/1200/630",
      "images": [
        { "id": 201, "url": "https://picsum.photos/seed/hoodie-front/600/600" },
        { "id": 202, "url": "https://picsum.photos/seed/hoodie-back/600/600" }
      ],
      "average_rating": "4.6",
      "rating_count": 8,
      "reviews": [
        { "id": 1, "author": "Alex Reed", "content": "Heavy, stiff, perfect sharp edges. Love the brutalist look.", "rating": 5, "date": "2026-06-18" },
        { "id": 2, "author": "Morgan Vance", "content": "Excellent construct. Size up for an oversized fit.", "rating": 4, "date": "2026-06-19" }
      ],
      "_terms": {
        "product_cat": [
          { "id": 1, "slug": "apparel", "name": "Apparel" }
        ],
        "product_tag": [
          { "id": 10, "slug": "hoodie", "name": "Hoodie" }
        ]
      }
    },
    {
      "id": 102,
      "type": "variable",
      "title": "Raw Edge Heavy Tee",
      "excerpt": "A premium boxy-fit tee featuring concrete-dye coloring and flat double-hem details.",
      "content": "<p>Designed as the foundational base-layer, this tee features dropped shoulders and raw-cut hem lines. dyed in industrial concrete tones.</p>",
      "sku": "FWP-TEE-02",
      "stock_status": "instock",
      "featuredImage": "https://picsum.photos/seed/tee/1200/630",
      "images": [
        { "id": 203, "url": "https://picsum.photos/seed/concrete-tee/600/600" },
        { "id": 204, "url": "https://picsum.photos/seed/coal-tee/600/600" }
      ],
      "attributes": [
        { "name": "Size", "options": ["S", "M", "L"] },
        { "name": "Color", "options": ["Concrete", "Coal"] }
      ],
      "variations": [
        {
          "id": 1021,
          "attributes": { "Size": "S", "Color": "Concrete" },
          "price": "29.99",
          "regular_price": "29.99",
          "stock_status": "instock",
          "image": { "id": 203, "url": "https://picsum.photos/seed/concrete-tee/600/600" }
        },
        {
          "id": 1022,
          "attributes": { "Size": "M", "Color": "Concrete" },
          "price": "29.99",
          "regular_price": "29.99",
          "stock_status": "instock",
          "image": { "id": 203, "url": "https://picsum.photos/seed/concrete-tee/600/600" }
        },
        {
          "id": 1023,
          "attributes": { "Size": "L", "Color": "Concrete" },
          "price": "32.99",
          "regular_price": "32.99",
          "stock_status": "instock",
          "image": { "id": 203, "url": "https://picsum.photos/seed/concrete-tee/600/600" }
        },
        {
          "id": 1024,
          "attributes": { "Size": "S", "Color": "Coal" },
          "price": "34.99",
          "regular_price": "39.99",
          "stock_status": "instock",
          "image": { "id": 204, "url": "https://picsum.photos/seed/coal-tee/600/600" }
        },
        {
          "id": 1025,
          "attributes": { "Size": "M", "Color": "Coal" },
          "price": "34.99",
          "regular_price": "39.99",
          "stock_status": "instock",
          "image": { "id": 204, "url": "https://picsum.photos/seed/coal-tee/600/600" }
        },
        {
          "id": 1026,
          "attributes": { "Size": "L", "Color": "Coal" },
          "price": "37.99",
          "regular_price": "39.99",
          "stock_status": "outofstock",
          "image": { "id": 204, "url": "https://picsum.photos/seed/coal-tee/600/600" }
        }
      ],
      "average_rating": "4.8",
      "rating_count": 5,
      "reviews": [
        { "id": 3, "author": "Sam Miller", "content": "Coal color is incredibly deep. Boxy fit is perfect.", "rating": 5, "date": "2026-06-17" }
      ],
      "_terms": {
        "product_cat": [
          { "id": 1, "slug": "apparel", "name": "Apparel" }
        ],
        "product_tag": [
          { "id": 11, "slug": "t-shirt", "name": "T-Shirt" }
        ]
      }
    },
    {
      "id": 103,
      "type": "grouped",
      "title": "Studio Concrete Capsule Pack",
      "excerpt": "A curated selection containing the Minimalist Brutalist Hoodie and the Raw Edge Heavy Tee in Concrete.",
      "content": "<p>Simplify your capsule wardrobe. This pack includes both our raw-seam hoodie and dye-finished boxy tee, bundled for offline design styling.</p>",
      "price": "",
      "regular_price": "",
      "sku": "FWP-PACK-03",
      "stock_status": "instock",
      "featuredImage": "https://picsum.photos/seed/pack/1200/630",
      "grouped_products": [101, 102],
      "average_rating": "5.0",
      "rating_count": 2,
      "reviews": [],
      "_terms": {
        "product_cat": [
          { "id": 2, "slug": "brutalist", "name": "Brutalist Design" }
        ]
      }
    },
    {
      "id": 104,
      "type": "external",
      "title": "Brutalist Typography & Layouts Book",
      "excerpt": "A printed guide detailing brutalist composition, stark grids, and web typography systems.",
      "content": "<p>Written by the creators of ForgeWP, this physical publication explores the visual history of high-contrast flat layout systems.</p>",
      "price": "19.99",
      "regular_price": "19.99",
      "sku": "FWP-BOOK-04",
      "stock_status": "instock",
      "featuredImage": "https://picsum.photos/seed/book/1200/630",
      "external_url": "https://external-publisher.com/book",
      "button_text": "Purchase from Publisher",
      "average_rating": "4.2",
      "rating_count": 3,
      "reviews": [],
      "_terms": {
        "product_cat": [
          { "id": 2, "slug": "brutalist", "name": "Brutalist Design" }
        ]
      }
    },
    {
      "id": 105,
      "type": "simple",
      "virtual": true,
      "downloadable": true,
      "title": "Brutalist Poster Art Print",
      "excerpt": "High-resolution digital vector graphic poster featuring geometric layout composition.",
      "content": "<p>A high-fidelity digital artwork print ready for architectural framing. Instantly delivered in vector formats.</p>",
      "price": "9.99",
      "regular_price": "9.99",
      "sku": "FWP-POST-05",
      "stock_status": "instock",
      "featuredImage": "https://picsum.photos/seed/poster/1200/630",
      "average_rating": "4.9",
      "rating_count": 12,
      "downloads": [
        { "name": "High-Res PDF Vector", "url": "https://example.com/downloads/brutalist-poster.pdf" }
      ],
      "reviews": [],
      "_terms": {
        "product_cat": [
          { "id": 3, "slug": "digital", "name": "Digital Art" }
        ],
        "product_tag": [
          { "id": 12, "slug": "print", "name": "Print" }
        ]
      }
    }
  ];

  writeFileSync(productsPath, JSON.stringify(productsData, null, 2), "utf8");

  console.log(pc.green(`\n⚡ E-Commerce Mock Sandbox successfully created!`));
  console.log(`   Local DB: ${pc.cyan(`cms/products.json`)}`);
  console.log(`\n🎉 Seeded 5 standard products of different WooCommerce types:`);
  console.log(`   1. ${pc.yellow("Simple Product")} (Minimalist Brutalist Hoodie)`);
  console.log(`   2. ${pc.yellow("Variable Product")} (Raw Edge Heavy Tee with attributes/variations)`);
  console.log(`   3. ${pc.yellow("Grouped Product")} (Studio Concrete Capsule Pack)`);
  console.log(`   4. ${pc.yellow("External/Affiliate Product")} (Brutalist Typography Book)`);
  console.log(`   5. ${pc.yellow("Virtual & Downloadable Product")} (Brutalist Poster Art Print)`);
}

if (type === "auth") {
  const usersPath = path.join(wpDir, "users.json");
  const rolesPath = path.join(wpDir, "roles.json");
  const sessionsPath = path.join(wpDir, "sessions.json");
  const usersTsPath = path.join(wpDir, "users.ts");
  const rolesTsPath = path.join(wpDir, "roles.ts");
  const hasUsers = existsSync(usersPath) || existsSync(usersTsPath);
  const hasRoles = existsSync(rolesPath) || existsSync(rolesTsPath);

  // 1. Seed JSON files (skip when the typed .ts source already exists)
  if (!hasUsers || !hasRoles || !existsSync(sessionsPath)) {
    const seededUsers = [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@forgewp.local",
        "displayName": "Concrete Designer",
        "roles": ["administrator"],
        "avatarUrl": "https://picsum.photos/seed/avatar1/150/150",
        "emailVerified": true
      },
      {
        "id": 2,
        "username": "subscriber",
        "email": "user@forgewp.local",
        "displayName": "Sub Concrete",
        "roles": ["subscriber"],
        "avatarUrl": "https://picsum.photos/seed/avatar2/150/150",
        "emailVerified": true
      },
      {
        "id": 3,
        "username": "editor",
        "email": "editor@forgewp.local",
        "displayName": "Concrete Editor",
        "roles": ["editor"],
        "avatarUrl": "https://picsum.photos/seed/avatar3/150/150",
        "emailVerified": true
      },
      {
        "id": 4,
        "username": "customer",
        "email": "customer@forgewp.local",
        "displayName": "Concrete Customer",
        "roles": ["customer"],
        "avatarUrl": "https://picsum.photos/seed/avatar4/150/150",
        "emailVerified": true
      }
    ];

    const seededRoles = {
      "administrator": ["manage_options", "edit_theme_options", "edit_posts", "edit_others_posts", "publish_posts", "read"],
      "editor": ["edit_posts", "edit_others_posts", "publish_posts", "read"],
      "author": ["edit_posts", "publish_posts", "read"],
      "subscriber": ["read"],
      "customer": ["read"]
    };

    const seededSessions = [];

    if (!hasUsers) writeFileSync(usersPath, JSON.stringify(seededUsers, null, 2), "utf8");
    if (!hasRoles) writeFileSync(rolesPath, JSON.stringify(seededRoles, null, 2), "utf8");
    if (!existsSync(sessionsPath)) writeFileSync(sessionsPath, JSON.stringify(seededSessions, null, 2), "utf8");

    console.log(pc.green(`  ✅ Seeded authentication mock data files in cms/`));
  }

  // 2. Copy Pages & Components (without overwriting)
  const templatesDir = path.join(__dirname, "..", "templates", "auth");
  const copyIfNotExist = (src, dest) => {
    if (existsSync(dest)) {
      console.log(pc.yellow(`   ℹ️  Skipping existing file: ${path.relative(projectRoot, dest)}`));
      return;
    }
    const dir = path.dirname(dest);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(dest, readFileSync(src, 'utf8'), 'utf8');
    console.log(pc.green(`   ✅ Created file: ${path.relative(projectRoot, dest)}`));
  };

  // 2. Provision UI primitives from canonical auth templates
  const uiSrcDir = path.join(templatesDir, 'ui');
  const uiDestDir = path.join(projectRoot, 'src', 'components', 'ui');
  if (existsSync(uiSrcDir)) {
    const uiFiles = ['button.tsx', 'card.tsx', 'field.tsx', 'input.tsx', 'label.tsx', 'separator.tsx'];
    for (const uiFile of uiFiles) {
      const srcFile = path.join(uiSrcDir, uiFile);
      if (existsSync(srcFile)) {
        copyIfNotExist(srcFile, path.join(uiDestDir, uiFile));
      }
    }
  }

  // Fallback: If any required UI component is missing, pull via shadcn add
  let projectStyle = "shadcn";
  try {
    const wpConfigPath = path.join(projectRoot, "wp.config.ts");
    if (existsSync(wpConfigPath)) {
      const content = readFileSync(wpConfigPath, "utf8");
      const styleMatch = content.match(/style:\s*['"](forgewp|shadcn)['"]/);
      if (styleMatch && styleMatch[1]) {
        projectStyle = styleMatch[1];
      }
    }
  } catch (e) {}

  const requiredUi = ["card", "input", "button", "field"];
  for (const uiComp of requiredUi) {
    const compFile = path.join(uiDestDir, `${uiComp}.tsx`);
    if (!existsSync(compFile)) {
      try {
        console.log(pc.cyan(`  📦 Pulling required "${uiComp}" UI component via shadcn...`));
        await addComponent(uiComp, { style: projectStyle });
      } catch (err) {
        console.warn(pc.yellow(`  ⚠  Could not auto-add "${uiComp}": ${err.message}`));
      }
    }
  }

  const componentsSrcDir = path.join(templatesDir, 'components');
  const componentsDestDir = path.join(projectRoot, 'src', 'components');
  if (existsSync(componentsSrcDir)) {
    copyIfNotExist(path.join(componentsSrcDir, 'login-form-wrapper.tsx'), path.join(componentsDestDir, 'login-form-wrapper.tsx'));
    copyIfNotExist(path.join(componentsSrcDir, 'signup-form-wrapper.tsx'), path.join(componentsDestDir, 'signup-form-wrapper.tsx'));
    copyIfNotExist(path.join(componentsSrcDir, 'forgot-password-form-wrapper.tsx'), path.join(componentsDestDir, 'forgot-password-form-wrapper.tsx'));
    copyIfNotExist(path.join(componentsSrcDir, 'reset-password-form-wrapper.tsx'), path.join(componentsDestDir, 'reset-password-form-wrapper.tsx'));
    copyIfNotExist(path.join(componentsSrcDir, 'verify-email-view-wrapper.tsx'), path.join(componentsDestDir, 'verify-email-view-wrapper.tsx'));
    copyIfNotExist(path.join(componentsSrcDir, 'dashboard-view-wrapper.tsx'), path.join(componentsDestDir, 'dashboard-view-wrapper.tsx'));
  }

  const pagesSrcDir = path.join(templatesDir, 'pages');
  const pagesDestDir = path.join(projectRoot, 'src', 'app', 'pages');
  if (existsSync(pagesSrcDir)) {
    const pages = ['LoginPage.tsx', 'SignUpPage.tsx', 'VerifyEmailPage.tsx', 'ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx', 'DashboardPage.tsx'];
    for (const page of pages) {
      copyIfNotExist(path.join(pagesSrcDir, page), path.join(pagesDestDir, page));
    }
  }

  // 3. Inject WpAuthProvider in src/app/layout.tsx
  const layoutPath = path.join(projectRoot, 'src', 'app', 'layout.tsx');
  if (existsSync(layoutPath)) {
    let layoutContent = readFileSync(layoutPath, 'utf8');
    if (!layoutContent.includes('WpAuthProvider')) {
      layoutContent = 'import { WpAuthProvider } from "@forgewp/auth";\n' + layoutContent;
      // Robustly wrap JSX children with WpAuthProvider
      layoutContent = layoutContent.replace(/(>\s*)\{\s*children\s*\}(\s*<)/, '$1<WpAuthProvider>{children}</WpAuthProvider>$2');
      writeFileSync(layoutPath, layoutContent, 'utf8');
      console.log(pc.green(`   ✅ Wrapped root layout in <WpAuthProvider>`));
    }
  }

  // 4. Register Routes in src/app/routes.tsx
  const routesPath = path.join(projectRoot, 'src', 'app', 'routes.tsx');
  if (existsSync(routesPath)) {
    let routesContent = readFileSync(routesPath, 'utf8');
    if (!routesContent.includes('/forgot-password')) {
      const importBlock = `import * as LoginPage from "./pages/LoginPage";\nimport * as SignUpPage from "./pages/SignUpPage";\nimport * as VerifyEmailPage from "./pages/VerifyEmailPage";\nimport * as ForgotPasswordPage from "./pages/ForgotPasswordPage";\nimport * as ResetPasswordPage from "./pages/ResetPasswordPage";\n`;
      routesContent = importBlock + routesContent;

      const routesBlock = `      <Route path="/login" component={withLayout(LoginPage)} />\n      <Route path="/signup" component={withLayout(SignUpPage)} />\n      <Route path="/verify-email" component={withLayout(VerifyEmailPage)} />\n      <Route path="/forgot-password" component={withLayout(ForgotPasswordPage)} />\n      <Route path="/reset-password" component={withLayout(ResetPasswordPage)} />\n`;
      if (routesContent.includes('<Route path="/query-sandbox"')) {
        routesContent = routesContent.replace('<Route path="/query-sandbox"', routesBlock + '      <Route path="/query-sandbox"');
      } else if (routesContent.includes('<Route path="/" component={withLayout(HomePage)} />') || routesContent.includes('<Route path="/" component={HomePage} />')) {
        routesContent = routesContent.replace(/<Route path="\/" component=\{.*?\} \/>/, (match) => `${match}\n${routesBlock}`);
      } else {
        routesContent = routesContent.replace(/<Switch>/i, `<Switch>\n${routesBlock}`);
      }
      writeFileSync(routesPath, routesContent, 'utf8');
      console.log(pc.green(`   ✅ Registered auth routes in src/app/routes.tsx`));
    }
  }

  // 5. Update wp.config.ts to include auth configuration block if missing
  const wpConfigPath = path.join(projectRoot, 'wp.config.ts');
  if (existsSync(wpConfigPath)) {
    let configContent = readFileSync(wpConfigPath, 'utf8');
    if (!configContent.includes('auth:')) {
      const authConfigBlock = `  auth: {
    loginField: 'usernameAndEmail',
    defaultRole: 'subscriber',
    reservedUsernames: ['admin', 'system', 'root', 'administrator'],
    features: {
      registration: true,
      emailVerification: true,
      blockLoginUntilVerified: true,
      autoLoginAfterSignup: false,
    },
    emails: {
      verification: {
        subject: 'Verify your ForgeWP Account',
        body: 'Welcome to ForgeWP! Click this link to verify your email address:\\n\\n{verification_url}',
      },
      passwordReset: {
        subject: 'Password Reset Request',
        body: 'Click the link below to reset your password:\\n\\n{reset_url}',
      },
    },
  },`;

      if (configContent.includes('defineConfig({')) {
        configContent = configContent.replace(/(defineConfig\(\{)/, `$1\n${authConfigBlock}`);
      } else if (configContent.includes('const config: ForgeWPThemeConfig = {')) {
        configContent = configContent.replace(/(const config:\s*ForgeWPThemeConfig\s*=\s*\{)/, `$1\n${authConfigBlock}`);
      } else {
        configContent = configContent.replace(/(export default \{)/, `$1\n${authConfigBlock}`);
      }
      writeFileSync(wpConfigPath, configContent, 'utf8');
      console.log(pc.green(`   ✅ Added auth settings block to wp.config.ts`));
    } else if (!configContent.includes('passwordReset:')) {
      if (configContent.includes('emails: {') && configContent.includes('verification: {')) {
        const passwordResetBlock = `      passwordReset: {
        subject: 'Password Reset Request',
        body: 'Click the link below to reset your password:\\n\\n{reset_url}',
      },`;
        configContent = configContent.replace(/(verification:\s*\{[^}]*\},)/, `$1\n${passwordResetBlock}`);
        writeFileSync(wpConfigPath, configContent, 'utf8');
        console.log(pc.green(`   ✅ Added passwordReset template block to wp.config.ts`));
      }
    }
  }

  // 6. Ensure package.json has @forgewp/auth dependency and paths are set
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    let packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.dependencies) packageJson.dependencies = {};
    if (!packageJson.dependencies['@forgewp/auth']) {
      const isWorkspace = existsSync(path.join(projectRoot, '..', 'pnpm-workspace.yaml'));
      packageJson.dependencies['@forgewp/auth'] = isWorkspace ? 'workspace:*' : '^0.1.0';
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      console.log(pc.green(`   ✅ Added @forgewp/auth to package.json dependencies`));
    }
  }

  console.log(pc.green(`\n⚡ Authentication Mock Sandbox successfully created!`));
}
