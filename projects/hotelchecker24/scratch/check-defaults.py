import re, json, sys
path = r"C:\Users\hp\Desktop\ForgeWP\hotelchecker24\.forgewp\out\hotelchecker24\functions.php"
php = open(path, encoding="utf-8", errors="replace").read()
# find JSON blocks array assignment
m = re.search(r"(\[\{" + r'"apiVersion".*)', php)
if not m:
    print("no array start")
    sys.exit(1)
# find the end of the PHP string / assignment - look for ]; after the big array
start = m.start(1)
# Try parse from largest JSON
raw = None
for end_pat in [r"\];\s*\n", r"\];"]:
    end_m = re.search(end_pat, php[start:])
    if end_m:
        candidate = php[start:start+end_m.start()+1]
        try:
            blocks = json.loads(candidate)
            raw = candidate
            break
        except Exception as e:
            print("parse fail", type(e).__name__, str(e)[:120])
if raw is None:
    # fallback: scan customEditJsx with a careful decoder
    print("fallback scan")
    i = 0
    count = 0
    while True:
        ni = php.find('"name":"forgewp/', i)
        if ni < 0: break
        ne = php.find('"', ni+8)
        name = php[ni+8:ne]
        ci = php.find('"customEditJsx":"', ni)
        # only if next block name is after this customEditJsx
        nextn = php.find('"name":"forgewp/', ne)
        if ci < 0 or (nextn > 0 and ci > nextn):
            i = ne
            continue
        # parse JSON string
        j = ci + len('"customEditJsx":"')
        out = []
        while j < len(php):
            c = php[j]
            if c == '\\':
                out.append(php[j:j+2]); j += 2; continue
            if c == '"':
                break
            out.append(c); j += 1
        jsx = bytes(json.loads('"' + ''.join(out) + '"'), 'utf-8').decode('unicode_escape') if False else ''.join(out).encode('utf-8').decode('unicode_escape')
        # simpler: use codecs
        import codecs
        jsx = codecs.decode(''.join(out), 'unicode_escape')
        uses = bool(re.search(r'\bdefaults\b', jsx))
        has = 'const defaults' in jsx
        if uses or has:
            print(f"{name}: uses={uses} has_const={has} head={jsx[:100]!r}")
        count += 1
        i = j
    print("scanned", count)
    sys.exit(0)

print("parsed", len(blocks), "blocks")
for b in blocks:
    jsx = b.get("customEditJsx") or ""
    uses = bool(re.search(r"\bdefaults\b", jsx))
    has = "const defaults" in jsx
    if uses or has:
        print(f"{b.get('name')}: uses={uses} has_const={has}")
        if uses and not has:
            print("  MISSING INJECTION")
            print("  head:", jsx[:150])
        elif has:
            # show defaults object keys
            m2 = re.search(r"const defaults = (\{.*?\});", jsx)
            if m2:
                print("  defaults keys sample:", m2.group(1)[:120])
