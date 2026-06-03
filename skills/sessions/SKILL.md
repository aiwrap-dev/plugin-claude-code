---
description: List recent AIWrap coding sessions with model, duration, and language breakdown
disable-model-invocation: true
---

Display recent AIWrap sessions. The optional argument is `--limit N` (default 10, max 50).

Extract the limit value from the argument if provided (e.g. `--limit 20` ��� 20). Clamp to 1���50. If not provided, use 10.

Run this script silently (replace `<LIMIT>` with the resolved number before running):

```bash
node -e "
const fs = require('fs');
const os = require('os');
const cfgPath = os.homedir() + '/.aiwrap/settings.json';
if (!fs.existsSync(cfgPath)) { console.log('not-configured'); process.exit(0); }
const { token } = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
fetch(base + '/api/plugin/sessions?limit=<LIMIT>', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d)))
  .catch(() => console.log('{}'));
"
```

If output is `not-configured`, tell the user to run `/aiwrap:setup` first and stop.

Format the `sessions` array as a compact list. For each session show one line:

`YYYY-MM-DD  42m  sonnet  TS, Python  resolved  +18pts`

Shorten model names: `claude-sonnet-*` ��� `sonnet`, `claude-opus-*` ��� `opus`, `claude-haiku-*` ��� `haiku`. Show at most 3 languages. Use `���` for null fields. If duration ��� 60 min, format as `1h 12m`.

If no sessions, say: "No sessions recorded yet. The Stop hook tracks sessions automatically after each Claude response."
