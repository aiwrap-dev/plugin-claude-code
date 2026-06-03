---
description: Show AIWrap session stats for the current git project
disable-model-invocation: true
---

Show AIWrap tracking data for the current git project.

## Step 1 ��� Read token

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try { const c = JSON.parse(fs.readFileSync(p,'utf8')); console.log(c.token || ''); } catch { console.log(''); }
"
```

If token is empty, tell the user to run `/aiwrap:setup` first and stop.

## Step 2 ��� Get git context

```bash
git remote get-url origin 2>/dev/null || echo ""
```

```bash
git rev-list --max-parents=0 HEAD 2>/dev/null | head -1 || echo ""
```

If both outputs are empty, say: "No git remote found in this directory. AIWrap links sessions to projects via git remote URL." and stop.

## Step 3 ��� Fetch project stats

Replace `<REMOTE>` and `<FIRST_COMMIT>` with the values from Step 2 before running:

```bash
node -e "
const fs = require('fs'), os = require('os');
const { token } = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
const params = new URLSearchParams({ remote: '<REMOTE>', firstCommit: '<FIRST_COMMIT>' });
fetch(base + '/api/plugin/stats?' + params.toString(), { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d)))
  .catch(() => console.log('{}'));
"
```

## Step 4 ��� Format output

Infer the project name from the remote URL (e.g. `github.com/user/repo` ��� `user/repo`).

Show:
- **Project** ��� inferred name
- **Remote** ��� the full remote URL
- **Sessions** ��� `totalSessions` total recorded in this workspace
- **Active days** ��� `activeDays`
- **Top languages** ��� from `languageBreakdown` (top 5)
- **Current streak** ��� `currentStreak` days
- **Points** ��� `totalPoints`

If the response has no session data (`totalSessions` is 0 or missing): "This project has no sessions recorded yet. Sessions are linked automatically when you code here with Claude Code."
