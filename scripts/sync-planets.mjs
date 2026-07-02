#!/usr/bin/env node
// Nightly Star Wars planet sync.
//
// Enumerates every planet on Wookieepedia (canon + legends, all share the
// {{CelestialBody}} infobox) and mirrors everything into ONE file,
// src/data/planets.json: map placement (position/size/colour/type/continuity)
// AND the facts panel data. Planet images download into
// src/assets/planets/worlds/<id>/preview.* where planetImages.js auto-discovers
// them (require.context) — no manifest. Runs incrementally (skips unchanged
// pages via a revid cache) so the app never hits the API at runtime.
//
// Usage:
//   node scripts/sync-planets.mjs [--limit N] [--no-images] [--canon-only]
//
// See scripts/.cache/last-run.log for the latest run report.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  listTemplateTransclusions,
  fetchRevisions,
  fetchPage,
  resolveImage,
  download,
} from './lib/wookiee.mjs'
import {
  extractTemplate,
  parseFields,
  cleanValue,
  toList,
  classifyType,
  TYPE_COLOR,
} from './lib/infobox.mjs'
import { computePosition } from './lib/position.mjs'
import {
  coordPair,
  diameterValue,
  toFloat,
  continuityArray,
  parsePopulation,
} from './lib/normalize.mjs'

// Cache stores the RAW response per page ({revid, categories, lead}); all facts
// / continuity are re-derived from it on every run, so logic changes never
// require re-fetching. Bump only when the RAW cache shape changes.
const SCHEMA_VERSION = 5

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')
const DATA = path.join(ROOT, 'src', 'data')
const WORLDS_DIR = path.join(ROOT, 'src', 'assets', 'planets', 'worlds')
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'pages.json')
const LOG_FILE = path.join(CACHE_DIR, 'last-run.log')
const PLANETS_FILE = path.join(DATA, 'planets.json')

// --- CLI -----------------------------------------------------------------
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def
}
const OPTS = {
  limit: parseInt(opt('limit', '0'), 10) || 0,
  images: !flag('no-images'),
  canonOnly: flag('canon-only'),
  fromCache: flag('from-cache'), // rebuild planets.json from cache only, no API
}

const logLines = []
let liveLine = false // a \r progress line is currently on screen
const log = (msg) => {
  if (liveLine) { process.stdout.write('\n'); liveLine = false }
  console.log(msg)
  logLines.push(`${new Date().toISOString()}  ${msg}`)
}

// Throttled in-place progress line (updates ~once/second). Lets you watch how
// far the import is and whether it has stalled/aborted.
let lastTick = 0
function tick(label, done, total, extra) {
  const now = Date.now()
  if (now - lastTick < 1000 && done < total) return
  lastTick = now
  const pct = total ? Math.floor((done / total) * 100) : 0
  const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '·')
  const line = `  ${label} [${bar}] ${String(pct).padStart(3)}% ${done}/${total} · ${extra}`
  if (process.stdout.isTTY) {
    // Animated in-place line in a real terminal.
    process.stdout.write(`\r${line}    `)
    liveLine = true
  } else {
    // Background/piped: one line per second so `tail -f` shows live progress.
    console.log(line)
    logLines.push(`${new Date().toISOString()} ${line}`)
  }
}
function endTick() {
  if (liveLine) { process.stdout.write('\n'); liveLine = false }
}

// --- helpers -------------------------------------------------------------
const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}
const writeJson = (file, obj) => fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n')

// Run `worker` over items with up to `concurrency` in flight (network latency
// overlaps; the API rate limiter in wookiee.mjs keeps the overall pace polite).
async function pool(items, concurrency, worker) {
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const idx = next++
      await worker(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
}
const CONCURRENCY = 12

// Fields refreshed from the source on every run (canonical), rather than
// fill-gapped. The map position is derived from the galactic grid square.
const AUTHORITATIVE = new Set(['position', 'coordinates', 'xyz'])

// Continuity is derived data: union the observations, never downgrade.
const mergeContinuity = (oldC, newC) => {
  if (!oldC) return newC
  if (!newC || oldC === newC) return oldC
  return 'both'
}

// Wiki title -> stable kebab id (matching existing curated ids where possible).
function idFromTitle(title) {
  return title
    .replace(/\/Legends$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Wiki categories use underscores ("Desert_planets") — normalise, then test.
function isPlanet(categories) {
  const cats = categories.map((c) => c.toLowerCase().replace(/_/g, ' '))
  return cats.some((c) => /\bplanets?\b/.test(c))
}

// Canon vs Legends is NOT reliable from the title: Legends-only planets live at
// their base title (no "/Legends" suffix — that suffix only exists when a canon
// counterpart also does). The reliable marker is the article's category: canon
// articles are tagged "Canon articles"; everything else (/Legends pages AND
// legends-only base titles like "Vandor-1") is Legends.
function isCanonArticle(categories) {
  return categories.some((c) => /^canon[ _]articles/i.test(c))
}

// Turn a {{CelestialBody}} field map into strictly-typed facts + a placement
// record. See scripts/lib/normalize.mjs for the field transforms.
function deriveRecord(id, name, fields) {
  const grid = cleanValue(fields.coordinates)
  const climate = cleanValue(fields.climate)
  const cls = cleanValue(fields.class)
  const terrain = toList(fields.terrain)
  const region = toList(fields.region)[0] ?? ''
  const type = classifyType({ climate, class: cls, terrain: terrain.join(' ') })

  const facts = {
    climate,
    terrain, // array
    gravity: cleanValue(fields.gravity),
    diameter: diameterValue(cleanValue(fields.diameter)), // km -> float, else string
    rotation: toFloat(cleanValue(fields.lengthday || fields.rotation)), // -> float
    orbital: cleanValue(fields.lengthyear || fields.orbital),
    water: cleanValue(fields.water),
    population: parsePopulation(cleanValue(fields.population)), // -> { total, demographics }
    region,
    sector: cleanValue(fields.sector),
    system: cleanValue(fields.system),
    atmosphere: cleanValue(fields.atmosphere),
    class: cls,
    coordinates: coordPair(grid), // "R-16" -> ["R", 16]
    affiliation: toList(fields.affiliation || fields.government),
    species: toList(fields.species),
    pointsOfInterest: toList(fields.pointsofinterest || fields.locations),
  }
  // Drop empty scalars/arrays (keep numbers incl. 0, and objects).
  for (const k of Object.keys(facts)) {
    const v = facts[k]
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete facts[k]
  }

  const record = {
    name,
    position: computePosition(id, grid), // [x,y,z] from galactic grid, or null
    color: TYPE_COLOR[type] || '#b09a86',
    type,
    imageFile: extractFileTitle(fields.image),
  }
  return { facts, record }
}

function extractFileTitle(raw) {
  if (!raw) return null
  const m = /(?:File:)?\s*([^[\]|{}]+?\.(?:png|jpg|jpeg|gif|webp))/i.exec(String(raw))
  return m ? m[1].trim().replace(/ /g, '_') : null
}

// Lead section (everything before the first == heading) — contains the infobox
// + intro. Cached instead of the full article so the cache stays a sane size.
function leadSection(wikitext) {
  if (!wikitext) return ''
  const m = /\n==[^=\n]/.exec(wikitext)
  return m ? wikitext.slice(0, m.index) : wikitext
}

// Detect the real image type from magic bytes — the Fandom CDN often serves
// webp regardless of the .png/.jpg url, so trust the bytes, not the extension.
function sniffExt(buf) {
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg'
  if (buf.length >= 4 && buf.toString('ascii', 0, 3) === 'GIF') return 'gif'
  return 'png'
}

// Does this world already have a preview image on disk? (curated or synced)
async function hasPreview(dir) {
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    try {
      await fs.access(path.join(dir, `preview.${ext}`))
      return true
    } catch {}
  }
  return false
}

// --- main ----------------------------------------------------------------
async function main() {
  const started = Date.now()
  await fs.mkdir(CACHE_DIR, { recursive: true })
  log(`sync-planets start · images=${OPTS.images} canonOnly=${OPTS.canonOnly} limit=${OPTS.limit || '∞'}`)

  let cache = await readJson(CACHE_FILE, {})
  if (cache.__v !== SCHEMA_VERSION) cache = { __v: SCHEMA_VERSION } // schema changed → reparse

  const records = new Map() // id -> chosen derived (+ canonSeen)
  const presence = new Map() // id -> { canon, legends }
  const stats = { fetched: 0, cached: 0, images: 0, noGrid: 0, errors: 0 }

  // Build the full planets array from the current records (sync snapshot).
  const buildPlanets = () => {
    const arr = []
    for (const [id, { facts, record }] of records) {
      const pres = presence.get(id) || {}
      const cont = pres.canon && pres.legends ? 'both' : pres.canon ? 'canon' : 'legends'
      arr.push({
        id,
        name: record.name,
        continuity: continuityArray(cont),
        ...facts,
        position: record.position ?? null,
        color: record.color,
        type: record.type,
      })
    }
    return arr.sort((a, b) => a.id.localeCompare(b.id))
  }

  // Derive facts + continuity for one page from its RAW cache entry — purely
  // local, so any logic change re-applies on the next run with no API calls.
  const ingest = (id, title, raw) => {
    if (!raw || raw.lead === undefined || !isPlanet(raw.categories)) return
    const canon = isCanonArticle(raw.categories)
    const fields = parseFields(extractTemplate(raw.lead, 'CelestialBody'))
    const name = cleanValue(fields.name) || title.replace(/\/Legends$/i, '')
    const derived = deriveRecord(id, name, fields)
    if (!derived.record.position) stats.noGrid++
    const pres = presence.get(id) || { canon: false, legends: false }
    if (canon) pres.canon = true
    else pres.legends = true
    presence.set(id, pres)
    // Canon precedence, order-independent (concurrent): canon always wins.
    const ex = records.get(id)
    if (!ex || (canon && !ex.canonSeen)) records.set(id, { ...derived, canonSeen: canon })
  }

  // Offline rebuild: recompute planets.json from the cached raw responses only —
  // no network at all (`npm run sync-planets:cache`).
  if (OPTS.fromCache) {
    const titles = Object.keys(cache).filter((t) => t !== '__v' && cache[t] && cache[t].lead !== undefined)
    log(`rebuilding from cache (offline): ${titles.length} pages`)
    let n = 0
    for (const title of titles) {
      ingest(idFromTitle(title), title, cache[title])
      if (++n % 500 === 0 || n === titles.length) tick('rebuild', n, titles.length, `planets=${records.size}`)
    }
    endTick()
    const planets = buildPlanets()
    await writeJson(PLANETS_FILE, planets)
    log(`done · ${planets.length} planets written from cache (no API)`)
    await fs.writeFile(LOG_FILE, logLines.join('\n') + '\n')
    return
  }

  // Incremental writes: planets.json grows live (~2.5s); the larger raw cache is
  // flushed less often (~20s) but always at the end (crash-resumable).
  let lastP = 0
  let lastC = 0
  let flushing = false
  const flush = async (force = false) => {
    if (flushing) return
    const now = Date.now()
    const doP = force || now - lastP >= 2500
    const doC = force || now - lastC >= 20000
    if (!doP && !doC) return
    flushing = true
    try {
      if (doP) { lastP = now; await writeJson(PLANETS_FILE, buildPlanets()) }
      if (doC) { lastC = now; await writeJson(CACHE_FILE, cache) }
    } finally {
      flushing = false
    }
  }

  // 1. Enumerate every planet page.
  let pages = await listTemplateTransclusions('CelestialBody')
  log(`enumerated ${pages.length} CelestialBody pages`)
  if (OPTS.canonOnly) pages = pages.filter((p) => !/\/Legends$/i.test(p.title))
  if (OPTS.limit) pages = pages.slice(0, OPTS.limit)

  // 2. Latest revids → decide what needs re-fetching.
  const revs = await fetchRevisions(pages.map((p) => p.title))

  await writeJson(PLANETS_FILE, []) // clear on start → file then grows live

  let done = 0
  await pool(pages, CONCURRENCY, async ({ title }) => {
    const revid = revs.get(title)
    const id = idFromTitle(title)
    let raw = cache[title]
    try {
      // Reuse cached raw response when the revision is unchanged; else fetch it
      // and store {revid, categories, lead} so we can always rebuild offline.
      if (!(raw && raw.revid === revid && raw.lead !== undefined)) {
        const page = await fetchPage(title)
        if (!page) { stats.errors++; return }
        raw = { revid: page.revid, categories: page.categories, lead: leadSection(page.wikitext) }
        cache[title] = raw
        stats.fetched++
      } else {
        stats.cached++
      }
      ingest(id, title, raw)
    } catch (err) {
      log(`  ! ${title}: ${err.message}`)
      stats.errors++
    } finally {
      done++
      tick('parse', done, pages.length, `planets=${records.size} fetched=${stats.fetched} cached=${stats.cached} err=${stats.errors}`)
      flush().catch(() => {})
    }
  })
  endTick()
  await flush(true) // final parse-phase write
  log(`parsed ${records.size} unique planets (${stats.fetched} fetched, ${stats.cached} cached, ${stats.errors} errors)`)

  // 3. Snapshot the fully-rebuilt planet list (already flushed to disk above).
  const planets = buildPlanets()

  // 4. Images -> src/assets/planets/worlds/<id>/preview.* (skip if one exists).
  if (OPTS.images) {
    const withImage = [...records.entries()].filter(([, r]) => r.record.imageFile)
    let seen = 0
    await pool(withImage, CONCURRENCY, async ([id, { record }]) => {
      const dir = path.join(WORLDS_DIR, id)
      try {
        if (await hasPreview(dir)) return
        const info = await resolveImage(record.imageFile)
        if (!info) return
        const buf = await download(info.url)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(path.join(dir, `preview.${sniffExt(buf)}`), buf)
        stats.images++
      } catch (err) {
        log(`  ! image ${id}: ${err.message}`)
      } finally {
        seen++
        tick('images', seen, withImage.length, `downloaded=${stats.images}`)
      }
    })
    endTick()
  }

  // 5. Final persist.
  await writeJson(PLANETS_FILE, planets)
  await writeJson(CACHE_FILE, cache)

  const secs = ((Date.now() - started) / 1000).toFixed(1)
  log(
    `done in ${secs}s · fetched=${stats.fetched} cached=${stats.cached} ` +
      `newImages=${stats.images} noGrid=${stats.noGrid} errors=${stats.errors} · written=${planets.length}`
  )
  await fs.writeFile(LOG_FILE, logLines.join('\n') + '\n')
}

main().catch(async (err) => {
  log(`FATAL: ${err.stack || err.message}`)
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.writeFile(LOG_FILE, logLines.join('\n') + '\n')
  } catch {}
  process.exit(1)
})
