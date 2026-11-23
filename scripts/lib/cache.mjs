// Shared raw-page cache for every sync-<type>.mjs script — keyed by wiki
// title (globally unique), not by type, so all sync scripts read/write the
// SAME cache file. Schema-versioned: bump CACHE_SCHEMA_VERSION only when the
// raw {revid, categories, lead} shape itself changes; per-type field-parsing
// logic changes re-derive from the same cached raw data for free.
//
// Sync scripts must not run concurrently against this cache — each does a
// full read/mutate/write cycle, so parallel runs can race and drop entries.
// Use `npm run sync-all` to run every type sequentially.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CACHE_SCHEMA_VERSION = 5

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')
export const CACHE_DIR = path.join(ROOT, 'scripts', '.cache')
export const CACHE_FILE = path.join(CACHE_DIR, 'pages.json')

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}
const writeJson = (file, obj) => fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n')

export async function readCache() {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  let cache = await readJson(CACHE_FILE, {})
  if (cache.__v !== CACHE_SCHEMA_VERSION) cache = { __v: CACHE_SCHEMA_VERSION }
  return cache
}

export const writeCache = (cache) => writeJson(CACHE_FILE, cache)
