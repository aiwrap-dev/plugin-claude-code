# AIWrap Claude Code Plugin

Automatically tracks your AI coding sessions and publishes them to your [aiwrap](https://aiwrap.dev) profile.

## Install

```bash
claude plugin enable /path/to/aiwrap-claude-plugin
```

Then authorize your device — type `/aiwrap:setup` inside Claude Code. A browser window will open for GitHub sign-in. Done.

## How it works

- A `Stop` hook fires after every Claude response
- It reads the session transcript to extract tokens, turns, tools used, and languages
- Posts the data to your aiwrap profile silently

## Skills

- `/aiwrap:setup` — Authorize this device (opens browser, saves token)
- `/aiwrap:stats` — Show your streak, rank, tokens, points, languages, and goals
- `/aiwrap:sessions` — List recent sessions with model, duration, and language breakdown
- `/aiwrap:spark` — Post a spark (key insight or snippet from your current work)
- `/aiwrap:insights` — Show your developer insights — readiness score, top skills, work patterns
- `/aiwrap:achievements` — Show earned achievements and next unlockable badges
- `/aiwrap:goals` — View or update your coding goals
- `/aiwrap:project` — Show session stats for the current git project
- `/aiwrap:prompt` — Load and run a saved AIWrap prompt by command name, or create a new one
- `/aiwrap:app` — Create a new AI app on AIWrap and get its builder URL
- `/aiwrap:badge` — Generate an AIWrap README badge to embed in your GitHub profile
- `/aiwrap:connections` — List authorized devices connected to your account
- `/aiwrap:group` — Show your group rankings and your position in each group
- `/aiwrap:summary` — List your recent AI-generated session summaries
- `/aiwrap:webmcp` — Show how to enable AIWrap WebMCP to expose your data as live MCP tools

## Config

Stored at `~/.aiwrap/settings.json`:

```json
{
  "token": "aiw_...",
  "hardware_id": "..."
}
```

## Environment variables

- `AIWRAP_URL` — Override the API base URL (default: `https://aiwrap.dev`)
