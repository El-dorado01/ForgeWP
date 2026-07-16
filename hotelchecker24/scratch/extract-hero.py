import re, json, codecs
path = r"C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\functions.php"
php = open(path, encoding="utf-8", errors="replace").read()
# extract hero-section customEditJsx properly via finding block in json-ish content
# Use PHP's registered blocks - search for name hero-section then customEditJsx
idx = php.find('"name":"forgewp/hero-section"')
print("hero-section at", idx)
# find customEditJsx after this
ci = php.find('"customEditJsx":"', idx)
print("customEditJsx at", ci)
j = ci + len('"customEditJsx":"')
chars = []
while j < len(php):
    c = php[j]
    if c == "\\":
        chars.append(php[j:j+2]); j += 2; continue
    if c == '"':
        break
    chars.append(c); j += 1
raw = "".join(chars)
# Unescape JSON string escapes
jsx = json.loads('"' + raw.replace('\n','\\n').replace('\r','\\r') + '"') if False else None
# Manual: the raw is already with \n as two chars backslash-n from file? 
# In PHP source the string is JSON-encoded inside a PHP string of a JSON array
# So we see: \"customEditJsx\":\"(() => {\\nconst defaults...
# When reading the PHP file as text, we get the file content as stored.
# Let's check first 500 chars of raw
print("RAW first 500:")
print(repr(raw[:500]))
print("---")
# Decode JSON escapes
jsx = codecs.decode(raw, "unicode_escape")
print("DECODED first 600:")
print(jsx[:600])
print("---")
print("has const defaults:", "const defaults" in jsx)
print("uses defaults.hero:", "defaults.hero_title" in jsx)
# Try to compile as Function body
body = "return " + jsx
try:
    compile(body, "<edit>", "exec")  # python won't work for JS
except: pass
# write to file for node check
open(r"C:\Users\hp\Desktop\ForgeWP\hotelchecker24\scratch\hero-iife.js","w",encoding="utf-8").write(jsx)
print("wrote hero-iife.js len", len(jsx))
