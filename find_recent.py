import os, time
d = r'd:\RMS_Siprahub'
cutoff = time.time() - 14 * 86400
files = []
for r, _, fs in os.walk(d):
    if 'node_modules' in r or 'venv' in r or '.git' in r or '.agent' in r or '.gemini' in r:
        continue
    for f in fs:
        if f.endswith('.py') or f.endswith('.tsx') or f.endswith('.md'):
            p = os.path.join(r, f)
            try:
                mt = os.path.getmtime(p)
                if mt > cutoff:
                    files.append((p, mt))
            except Exception:
                pass
files.sort(key=lambda x: x[1], reverse=True)
for f in files[:40]:
    print(time.ctime(f[1]), "-", os.path.relpath(f[0], d))
