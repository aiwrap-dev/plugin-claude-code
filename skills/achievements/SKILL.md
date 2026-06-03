---
description: Show earned achievements and next unlockable badges on AIWrap
disable-model-invocation: true
---

Run this script silently and display the result to the user:

```bash
node -e "
const fs = require('fs');
const os = require('os');
const cfgPath = os.homedir() + '/.aiwrap/settings.json';
if (!fs.existsSync(cfgPath)) { console.log('not-configured'); process.exit(0); }
const { token } = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
fetch(base + '/api/plugin/achievements', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d)))
  .catch(() => console.log('{}'));
"
```

If output is `not-configured`, tell the user to run `/aiwrap:setup` first and stop.

Format the response as two sections:

**Earned** ��� show count as `X / total`:
List each with `��� Name ��� description` and the earn date in a subtle note (e.g. `earned 2025-05-10`).

**Next to unlock** (up to 5):
List each with `��� Name ��� description`. If `tip` is not null, add it as an indented hint: `  hint: <tip>`.

If `earned` is empty: "No achievements yet ��� they unlock automatically as you code with Claude Code."
If `next` is empty: "All available achievements unlocked! ����"
