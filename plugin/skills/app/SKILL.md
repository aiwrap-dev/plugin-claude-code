---
description: Create a new AI app on AIWrap and get its builder URL
disable-model-invocation: true
---

Create a new AI app on AIWrap and get its builder URL. The optional argument sets the title and type.

```
/aiwrap:app                              ��� create untitled app (full)
/aiwrap:app "Stock price tracker"        ��� create full app with title
/aiwrap:app mini "Dark mode clock"       ��� create mini app (320��320px) with title
/aiwrap:app full "Portfolio dashboard"   ��� create full app with title
```

Mini apps are 320��320px widgets designed for the Workspace grid.
Full apps are regular web apps served at a dedicated URL.

## Step 1 ��� Read token

```bash
node -e "
const fs = require('fs'), os = require('os');
const p = os.homedir() + '/.aiwrap/settings.json';
try { const c = JSON.parse(fs.readFileSync(p,'utf8')); console.log(c.token || ''); } catch { console.log(''); }
"
```

If token is empty, tell the user to run `/aiwrap:setup` first and stop.

## Step 2 ��� Parse arguments

From the argument string:
- If it starts with `mini ` (case-insensitive) ��� set `is_mini_app = 1`, title = rest of string
- If it starts with `full ` (case-insensitive) ��� set `is_mini_app = 0`, title = rest of string
- Otherwise ��� set `is_mini_app = 0`, title = entire argument (may be empty)

Trim the title. If title is longer than 100 characters, truncate to 100 characters.

## Step 3 ��� Create the app

Build the request body: include `is_mini_app` always. Include `title` only if non-empty.

Replace `<TOKEN>`, `<IS_MINI>`, and `<TITLE_JSON>` with the resolved values before running.
`<TITLE_JSON>` is the JSON-encoded title string (e.g. `"My App"`) or omit the field entirely if title is empty.

```bash
node -e "
const fs = require('fs'), os = require('os');
const { token } = JSON.parse(fs.readFileSync(os.homedir() + '/.aiwrap/settings.json', 'utf8'));
const base = process.env.AIWRAP_URL || 'https://aiwrap.dev';
const body = { is_mini_app: <IS_MINI> };
const title = <TITLE_JSON>;
if (title) body.title = title;
fetch(base + '/api/plugin/apps', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify(body)
}).then(r => r.json()).then(d => console.log(JSON.stringify(d))).catch(() => console.log('{}'));
"
```

## Step 4 ��� Show result

If the response has `url`:

Show:
```
��� App created ��� open in browser to start building:

  <url>

Type your first message there to generate the app with your AI provider.
```

If `is_mini_app` was 1, add:
> This is a Mini App (320��320px) ��� designed for your Workspace grid.

If the response has an error or is empty, say: "Failed to create app. Try again or visit aiwrap.dev/apps."
