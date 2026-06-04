---
description: List authorized devices connected to your AIWrap account
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
fetch(base + '/api/connections', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => { if (!r.ok) return []; return r.json(); })
  .then(d => console.log(JSON.stringify(d)))
  .catch(() => console.log('[]'));
"
```

If output is `not-configured`, tell the user to run `/aiwrap:setup` first and stop.

If the response is an empty array or could not be fetched (the connections endpoint uses browser session auth and may return 401 for the plugin token), say: "View and manage your connected devices at: **aiwrap.dev/settings**" and stop.

Otherwise, format the connections as a list. For each connection show:

`��� [label]   [status]   last seen: [last_seen date or "���"]`

- Mark `approved` status in a positive way (e.g. "��� approved")
- Mark any other status as a warning (e.g. "��� [status]")
- If a label matches the current OS platform (`process.platform`: darwin ��� macOS, linux ��� Linux, win32 ��� Windows), note it as `(this device)`

If the list is empty: "No connected devices. Run `/aiwrap:setup` to authorize this device."

Note at the end: "To revoke a device, visit aiwrap.dev/settings."
