const cleanVal = "{(trendingTags || '').split(',').map(tag => tag.trim()).filter(Boolean).map((tag) => (";
const splitMapRegex = /^\{\s*\((?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\|\|\s*(['"])\2\)\s*\.split\(\s*(['"])([^'"]+)\3\s*\)(?:\.map\(\s*[a-zA-Z0-9_-]+\s*=>\s*[a-zA-Z0-9_-]+\.trim\(\)\s*\))?(?:\.filter\(\s*[a-zA-Z0-9_-]+\s*\))?\.map\(\s*\(\s*([a-zA-Z0-9_-]+)\s*\)\s*=>\s*\(\s*$/;

console.log("MATCH:", cleanVal.match(splitMapRegex));
