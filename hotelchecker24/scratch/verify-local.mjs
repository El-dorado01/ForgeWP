import { readFileSync } from "fs";
const p = "C:/Users/hp/Local Sites/hotelchecker24/app/public/wp-content/themes/hotelchecker24/functions.php";
const php = readFileSync(p, "utf8");
const m = php.match(/json_decode\(<<<'FORGEWP_BLOCKS'\r?\n([\s\S]*?)\r?\nFORGEWP_BLOCKS/);
const blocks = JSON.parse(m[1]);
const h = blocks.find((b) => b.name === "forgewp/hero-section");
console.log("Local hero editorScope.defaults keys", Object.keys(h.editorScope?.defaults || {}).length);
console.log("Local hero has var defaults", /var defaults\b/.test(h.customEditJsx));
const ed = readFileSync(
  "C:/Users/hp/Local Sites/hotelchecker24/app/public/wp-content/themes/hotelchecker24/assets/forgewp-editor.js",
  "utf8",
);
console.log("Local editor has editorScope binding", ed.includes("editorScope"));
