"""Fallback for archive-host outages: download pinned official production files.

Run from licensing/. Requires fpdi-tree.tmp.json and tfpdf-tree.tmp.json fetched
from GitHub's git/trees API for the commits recorded in composer.lock.
Every file is checked against its Git blob SHA-1 before it is written.
Normal installs should use Composer instead.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = (
    ('fpdi', 'FPDI', 'd97ade6368aa0b51b6316d5dc16a567e2bf60167'),
    ('tfpdf', 'tFPDF', '69b06444b929e0d54ffbb5efcadfe97ecbad831b'),
)


def fetch(job):
    name, repo, commit, entry = job
    relative = entry['path']
    destination = ROOT / 'vendor' / 'setasign' / name / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False) as handle:
        temporary = Path(handle.name)
    try:
        subprocess.run(['curl.exe', '-fsS', '--retry', '2', '--connect-timeout', '10', '--max-time', '45',
                        f'https://raw.githubusercontent.com/Setasign/{repo}/{commit}/{relative}', '-o', str(temporary)], check=True)
        data = temporary.read_bytes()
        digest = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        if digest != entry['sha']:
            raise RuntimeError(f'Integrity mismatch: {name}/{relative}')
        destination.write_bytes(data)
        return len(data)
    finally:
        temporary.unlink(missing_ok=True)


jobs = []
for name, repo, commit in PACKAGES:
    tree = json.loads((ROOT / f'{name}-tree.tmp.json').read_text())
    if tree['sha'] != commit or tree.get('truncated'):
        raise RuntimeError('Unexpected dependency tree')
    for entry in tree['tree']:
        path = entry['path']
        needed = path.startswith('src/') if name == 'fpdi' else path.startswith('font/') or path == 'tfpdf.php'
        if entry['type'] == 'blob' and (needed or path in ('composer.json', 'LICENSE.txt', 'README.md', 'README.txt')):
            jobs.append((name, repo, commit, entry))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    sizes = list(pool.map(fetch, jobs))
print(f'Verified {len(sizes)} official dependency files ({sum(sizes)} bytes).')
