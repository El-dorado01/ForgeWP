import { readFileSync, existsSync } from "fs";

const content = readFileSync("./hotelchecker24/src/app/pages/SingleHotelPage.tsx", "utf8");
const match = content.match(/export\s+const\s+editable\s*=\s*defineEditable\s*\(/);
console.log("match at", match?.index);
const startIndex = match.index + match[0].length;
let parenCount = 1;
let currentIndex = startIndex;
while (parenCount > 0 && currentIndex < content.length) {
  const char = content[currentIndex];
  if (char === "(") parenCount++;
  else if (char === ")") parenCount--;
  currentIndex++;
}
const schemaStr = content.substring(startIndex, currentIndex - 1);
console.log("--- SCHEMA ---");
console.log(schemaStr);
console.log("--- END ---");

const constRe =
  /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\}|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*");\s*/g;
let m;
let prelude = "";
const editableIdx = content.indexOf("defineEditable(");
while ((m = constRe.exec(content)) !== null) {
  if (editableIdx !== -1 && m.index > editableIdx) break;
  console.log("CONST", m[1], "at", m.index, "val", JSON.stringify(m[2].slice(0, 100)));
  prelude += `const ${m[1]} = ${m[2]};\n`;
}
console.log("prelude:\n", prelude);

const text = (opts) => ({ type: "text", ...opts });
const richText = (opts) => ({ type: "richText", ...opts });
const image = (opts) => ({ type: "image", ...opts });
const boolean = (opts) => ({ type: "boolean", ...opts });
const repeater = (opts) => ({ type: "repeater", ...opts });
const color = (opts) => ({ type: "color", ...opts });
const url = (opts) => ({ type: "url", ...opts });
const select = (opts) => ({ type: "select", ...opts });
const number = (opts) => ({ type: "number", ...opts });
const icon = (opts) => ({ type: "icon", provider: "lucide", ...opts });

try {
  const fn = new Function(
    "text",
    "richText",
    "image",
    "boolean",
    "repeater",
    "color",
    "url",
    "select",
    "number",
    "icon",
    `${prelude}return (${schemaStr});`,
  );
  const result = fn(text, richText, image, boolean, repeater, color, url, select, number, icon);
  console.log("OK keys", Object.keys(result));
} catch (e) {
  console.error("FAIL", e.message);
}
