---
description: Generate an AIWrap README badge to embed in your GitHub profile
disable-model-invocation: true
---

Run this script silently to get the username:

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try {
  const c = JSON.parse(fs.readFileSync(p,'utf8'));
  if (!c.token) { console.log('not-configured'); process.exit(0); }
  const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
  fetch(base + '/api/plugin/stats', { headers: { Authorization: 'Bearer ' + c.token } })
    .then(r => r.json())
    .then(d => console.log(d.username || 'unknown'))
    .catch(() => console.log('unknown'));
} catch { console.log('not-configured'); }
"
```

If output is `not-configured` or `unknown`, tell the user to run `/aiwrap:setup` first and stop.

Using the username (replace `<USERNAME>` in the snippets below), display:

---

**AIWrap badge for your README**

**Direct** ��� live stats, updates every ~5 min via GitHub camo:
```markdown
[![aiwrap](https://aiwrap.dev/api/badge/<USERNAME>)](https://aiwrap.dev/<USERNAME>)
```

**Compact style** ��� smaller badge:
```markdown
[![aiwrap](https://aiwrap.dev/api/badge/<USERNAME>?style=compact)](https://aiwrap.dev/<USERNAME>)
```

**Via shields.io** ��� alternative with shields.io styling:
```markdown
[![aiwrap](https://img.shields.io/endpoint?url=https://aiwrap.dev/api/badge/<USERNAME>/shields&style=flat-square)](https://aiwrap.dev/<USERNAME>)
```

---

Paste any of these into your `README.md`. The badge shows your current streak, total sessions, and tier.
