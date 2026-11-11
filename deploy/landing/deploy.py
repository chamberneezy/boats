"""Publish the coming-soon page (npm run build:landing -> dist-landing/) to
Firebase Hosting site `lacusapp-ch` in lacus-app-509713, served at lacusapp.ch.

Not the project's default site: that one holds the app-link files for email
sign-in (deploy/link-domain/). Uses gcloud's login, like that script.
Run: npm run build:landing && python3 deploy/landing/deploy.py
"""
import gzip, hashlib, json, os, subprocess, urllib.request

P = 'lacus-app-509713'
SITE = 'lacusapp-ch'
API = 'https://firebasehosting.googleapis.com/v1beta1'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dist-landing')
SKIP = {'CNAME'}  # GitHub Pages leftover; never served from here

tok = subprocess.check_output(['gcloud', 'auth', 'print-access-token']).decode().strip()
H = {'Authorization': 'Bearer ' + tok, 'x-goog-user-project': P, 'Content-Type': 'application/json'}


def call(method, url, body=None, headers=H, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=headers))
    t = r.read()
    return json.loads(t) if t else {}


files = {}
for d, _, names in os.walk(root):
    for n in names:
        full = os.path.join(d, n)
        rel = '/' + os.path.relpath(full, root).replace(os.sep, '/')
        if rel.lstrip('/') in SKIP:
            continue
        files[rel] = full
gz = {p: gzip.compress(open(f, 'rb').read(), mtime=0) for p, f in files.items()}
hashes = {p: hashlib.sha256(b).hexdigest() for p, b in gz.items()}

config = {
    'cleanUrls': True,
    'headers': [
        {'glob': '/assets/**', 'headers': {'Cache-Control': 'public, max-age=31536000, immutable'}},
        {'glob': '/lakes/**', 'headers': {'Cache-Control': 'public, max-age=604800'}},
        {'glob': '**/*.html', 'headers': {'Cache-Control': 'public, max-age=300'}},
    ],
}
v = call('POST', f'{API}/sites/{SITE}/versions', {'config': config})
name = v['name']
print('version', name.split('/')[-1], '-', len(files), 'files')
pop = call('POST', f'{API}/{name}:populateFiles', {'files': hashes})
need = set(pop.get('uploadRequiredHashes', []))
up_h = {'Authorization': H['Authorization'], 'x-goog-user-project': P, 'Content-Type': 'application/octet-stream'}
for p, h in hashes.items():
    if h in need:
        call('POST', f"{pop['uploadUrl']}/{h}", headers=up_h, raw=gz[p])
        need.discard(h)
        print('uploaded', p)
call('PATCH', f'{API}/{name}?update_mask=status', {'status': 'FINALIZED'})
rel = call('POST', f'{API}/sites/{SITE}/releases?versionName={name}', {'message': 'Coming-soon page'})
print('released', rel.get('name', rel))
