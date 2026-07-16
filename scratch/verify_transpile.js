import { transpileTernaries, transpileLoops, transpileConditionals, translateJsExpressionToPhp } from '../packages/compiler/lib/blocks/php-transpiler.js';

const testInputTernary = `{listiclesLoading ? (
  <div className="loading">Loading...</div>
) : matchingListicles.length > 0 ? (
  <div className="list">
    {matchingListicles.map((l) => (
      <div key={l.id}>{l.title}</div>
    ))}
  </div>
) : (
  <div className="empty">No listicles found.</div>
)}`;

console.log("=== Testing Nested Ternaries ===");
console.log("Original Input:\n", testInputTernary);
console.log("--------------------------------");

let phpMarkup = testInputTernary;
// 1. Loops
phpMarkup = transpileLoops(phpMarkup);
// 2. Conditionals
phpMarkup = transpileConditionals(phpMarkup, ['listiclesLoading', 'matchingListicles']);
// 3. Ternaries
phpMarkup = transpileTernaries(phpMarkup, ['listiclesLoading', 'matchingListicles']);

console.log("Transpiled PHP:\n", phpMarkup);
console.log("--------------------------------");

console.log("\n=== Testing JSON.parse ===");
const testInputJson = "JSON.parse(rawSomething || '{}')";
const translatedJson = translateJsExpressionToPhp(testInputJson, ['rawSomething']);
console.log("Original JS:", testInputJson);
console.log("Translated PHP:", translatedJson);
console.log("Expected PHP: json_decode((($rawSomething ?? null) ?: '{}'), true)");
if (translatedJson.includes("json_decode") && !translatedJson.includes("$JSON")) {
  console.log("✅ JSON.parse translation works!");
} else {
  console.log("❌ JSON.parse translation failed!");
}
