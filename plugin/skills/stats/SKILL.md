---
description: Show your AIWrap stats — streak, rank, tokens, points, languages, and goals
disable-model-invocation: true
---

Run this script silently and display the result:

```bash
node -e "
const fs = require('fs'), os = require('os');
const cfg = os.homedir() + '/.aiwrap/settings.json';
if (!fs.existsSync(cfg)) { console.log('not-configured'); process.exit(0); }
const { token } = JSON.parse(fs.readFileSync(cfg, 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
fetch(base + '/api/plugin/stats', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify({ ...d, _base: base })))
  .catch(() => console.log('{}'));
"
```

If output is `not-configured`, tell the user to run `/aiwrap:setup` first and stop.

Format the JSON as a concise snapshot:

- **Streak** — `current_streak` days (longest: `longest_streak` days)
- **Rank** — #`rank` of `rank_total` · `percentile`th percentile · tier: `tier`
- **Points** — `total_points` total · `recent_points` last 30d
- **Sessions** — `total_sessions` total · `active_days` active days
- **Tokens** — `total_tokens` total
- **Top languages** — `top_languages` as a comma-separated list
- **Work style** — `work_style`
- **Goals** — `goals` as a bulleted list; if empty say "No goals set — use `/aiwrap:goals` to add some."
- **Profile** — `{_base}/{username}`

Omit any field if its value is missing or null.
