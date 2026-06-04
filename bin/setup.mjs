#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const SCRIPT_PATH = fileURLToPath(import.meta.url)

const CONFIG_DIR = join(homedir(), '.aiwrap')
const CONFIG_PATH = join(CONFIG_DIR, 'settings.json')
const BASE_URL = process.env.AIWRAP_URL ?? 'https://aiwrap.dev'

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(data) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), { mode: 0o600 })
}


function getHardwareId() {
  try {
    const p = platform()
    if (p === 'darwin') {
      return execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID | awk -F'\"' '{print $4}'",
        { encoding: 'utf8' },
      ).trim()
    }
    if (p === 'linux') {
      return readFileSync('/etc/machine-id', 'utf8').trim()
    }
    if (p === 'win32') {
      return execSync(
        'powershell -Command "(Get-ItemProperty \\"HKLM:\\\\SOFTWARE\\\\Microsoft\\\\Cryptography\\").MachineGuid"',
        { encoding: 'utf8' },
      ).trim()
    }
  } catch {
    return null
  }
  return null
}

function getLabel() {
  const p = platform()
  const os = p === 'darwin' ? 'macOS' : p === 'win32' ? 'Windows' : 'Linux'
  return `Claude Code · ${os}`
}

async function pollAndSave(code, hardwareId) {
  const interval = 3000
  const maxAttempts = 200

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval))
    try {
      const res = await fetch(`${BASE_URL}/api/plugin/auth/token?code=${code}`)
      if (!res.ok) continue
      const data = await res.json()
      if (data.status === 'approved' && data.token) {
        const config = readConfig()
        writeConfig({ ...config, token: data.token, hardware_id: hardwareId, plugin_dir: PLUGIN_DIR, last_authorized: Date.now() })
        return
      }
      if (data.status === 'expired') return
    } catch {
    }
  }
}

async function waitForAuth(previousToken) {
  const maxWaitMs = 10 * 60 * 1000
  const start = Date.now()
  const initialLastAuth = readConfig().last_authorized ?? 0
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2000))
    const config = readConfig()
    const tokenChanged = config.token && config.token !== previousToken
    const reauthorized = (config.last_authorized ?? 0) > initialLastAuth
    if (tokenChanged || reauthorized) {
      process.stdout.write('authorized\n')
      return
    }
  }
  process.stdout.write('timeout\n')
}

async function main() {
  if (process.argv[2] === '--poll') {
    await pollAndSave(process.argv[3], process.argv[4] ?? null)
    return
  }

  if (process.argv[2] === '--wait') {
    await waitForAuth(process.argv[3] ?? null)
    return
  }

  const config = readConfig()
  const label = getLabel()
  const hardwareId = getHardwareId()

  const res = await fetch(`${BASE_URL}/api/plugin/auth/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, hardware_id: hardwareId }),
  })

  if (!res.ok) {
    process.stderr.write('error: Failed to reach AIWrap. Check your connection and try again.\n')
    process.exit(1)
  }

  const { code, url, expires_in } = await res.json()
  const minutes = Math.floor(expires_in / 60)

  const child = spawn(process.execPath, [SCRIPT_PATH, '--poll', code, hardwareId ?? ''], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  })
  child.unref()

  const prefix = config.token ? 'reconfigure' : 'setup'
  process.stdout.write(`${prefix}:${url}\n`)
  process.stdout.write(`expires:${minutes}\n`)
  process.stdout.write(`prev-token:${config.token ?? ''}\n`)
}

main().catch(() => process.exit(1))
