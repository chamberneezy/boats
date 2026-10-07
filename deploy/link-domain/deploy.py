import gzip, hashlib, json, os, subprocess, sys, urllib.request
P = 'lacus-app-509713'; root = os.path.dirname(os.path.abspath(__file__))
tok = subprocess.check_output(['gcloud', 'auth', 'print-access-token']).decode().strip()
H = {'Authorization': 'Bearer ' + tok, 'x-goog-user-project': P, 'Content-Type': 'application/json'}
def call(method, url, body=None, headers=H, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=headers))
    t = r.read(); return json.loads(t) if t else {}
API = 'https://firebasehosting.googleapis.com/v1beta1'
files = {'/index.html': 'index.html', '/.well-known/apple-app-site-association': '.well-known/apple-app-site-association', '/.well-known/assetlinks.json': '.well-known/assetlinks.json'}
gz = {p: gzip.compress(open(os.path.join(root, f), 'rb').read(), mtime=0) for p, f in files.items()}
hashes = {p: hashlib.sha256(b).hexdigest() for p, b in gz.items()}
v = call('POST', f'{API}/sites/{P}/versions', {'config': {'headers': [{'glob': '/.well-known/apple-app-site-association', 'headers': {'Content-Type': 'application/json'}}]}})
name = v['name']; print('version', name.split('/')[-1])
pop = call('POST', f'{API}/{name}:populateFiles', {'files': hashes})
for p, h in hashes.items():
    if h in pop.get('uploadRequiredHashes', []):
        call('POST', f"{pop['uploadUrl']}/{h}", headers={'Authorization': H['Authorization'], 'x-goog-user-project': P, 'Content-Type': 'application/octet-stream'}, raw=gz[p]); print('uploaded', p)
call('PATCH', f'{API}/{name}?update_mask=status', {'status': 'FINALIZED'})
rel = call('POST', f'{API}/sites/{P}/releases?versionName={name}', {'message': 'App link files for email sign-in, plus a forward to the Lacus site'})
print('released', rel.get('name', rel))
