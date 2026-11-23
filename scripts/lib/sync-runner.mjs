// Generic sync-<type>.mjs harness, extracted from sync-planets.mjs so every
// new content type (species, starships, people, ...) gets the same CLI
// flags, progress logging, concurrency pool, incremental-write/crash-resume
// behaviour and shared raw-page cache for free.
//
// A type-specific script just calls runSync({...}) with a handful of small
// callbacks (see scripts/sync-species.mjs for the smallest example).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  listTemplateTransclusions,
  fetchRevisions,
  fetchPage,
  resolveImage,
  download,
} from './wookiee.mjs'
import { extractTemplate, parseFields, extractLead, cleanValue } from './infobox.mjs'
import { idFromTitle, isCanonArticle } from './ids.mjs'
import { extractFileTitle, sniffExt, hasPreview } from './images.mjs'
import { readCache, writeCache } from './cache.mjs'
import { continuityArray } from './normalize.mjs'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

// --- CLI -------------------------------------------------------------------
// Shared by every sync-<type>.mjs invocation:
//   --limit N        only process the first N enumerated pages
//   --no-images       skip the image-download pass
//   --canon-only      drop /Legends pages before processing
//   --from-cache      offline rebuild from the cache only, no API calls
function parseArgs(argv) {
  const flag = (name) => argv.includes(`--${name}`)
  const opt = (name, def) => {
    const i = argv.indexOf(`--${name}`)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : def
  }
  return {
    limit: parseInt(opt('limit', '0'), 10) || 0,
    images: !flag('no-images'),
    canonOnly: flag('canon-only'),
    fromCache: flag('from-cache'),
  }
}

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

// Lead section (everything before the first == heading) — contains the
// infobox + intro. Cached instead of the full article so the cache stays sane.
function leadSection(wikitext) {
  if (!wikitext) return ''
  const m = /\n==[^=\n]/.exec(wikitext)
  return m ? wikitext.slice(0, m.index) : wikitext
}

/**
 * @param {object} opts
 * @param {string} opts.typeName   e.g. 'species' — used in logs and the log file name
 * @param {string} opts.template   Wookieepedia infobox template name, e.g. 'Species'
 * @param {string} opts.outFile    output path relative to repo root, e.g. 'src/data/species.json'
 * @param {string} opts.imagesDir  image dir relative to repo root, e.g. 'src/assets/species'
 * @param {(categories: string[]) => boolean} opts.isMember
 *   Sanity filter: is this transcluding page actually an instance of this type?
 *   (mirrors sync-planets.mjs's isPlanet — infobox transclusion alone can be noisy).
 * @param {(fields: Record<string,string>, ctx: {id, title, name, categories}) => object} opts.deriveFacts
 *   Turn the raw infobox field map into strictly-typed, type-specific facts
 *   (already cleaned via infobox.mjs helpers). May include `imageFile` to
 *   override the harness's default `fields.image` extraction.
 */
export async function runSync(opts) {
  const { typeName, template, outFile, imagesDir, isMember, deriveFacts } = opts
  const OPTS = parseArgs(process.argv.slice(2))

  const OUT_FILE = path.join(ROOT, outFile)
  const IMAGES_DIR = path.join(ROOT, imagesDir)
  const CACHE_DIR = path.join(ROOT, 'scripts', '.cache')
  const LOG_FILE = path.join(CACHE_DIR, `last-run-${typeName}.log`)

  const logLines = []
  let liveLine = false
  const log = (msg) => {
    if (liveLine) { process.stdout.write('\n'); liveLine = false }
    console.log(msg)
    logLines.push(`${new Date().toISOString()}  ${msg}`)
  }
  let lastTick = 0
  function tick(label, done, total, extra) {
    const now = Date.now()
    if (now - lastTick < 1000 && done < total) return
    lastTick = now
    const pct = total ? Math.floor((done / total) * 100) : 0
    const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '·')
    const line = `  ${label} [${bar}] ${String(pct).padStart(3)}% ${done}/${total} · ${extra}`
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${line}    `)
      liveLine = true
    } else {
      console.log(line)
      logLines.push(`${new Date().toISOString()} ${line}`)
    }
  }
  function endTick() {
    if (liveLine) { process.stdout.write('\n'); liveLine = false }
  }
  const writeJson = (file, obj) => fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n')

  const started = Date.now()
  log(`sync-${typeName} start · images=${OPTS.images} canonOnly=${OPTS.canonOnly} limit=${OPTS.limit || '∞'}`)

  let cache = await readCache()
  const records = new Map() // id -> { facts, imageFile, name, canonSeen }
  const presence = new Map() // id -> { canon, legends }
  const stats = { fetched: 0, cached: 0, images: 0, errors: 0 }

  const buildEntries = () => {
    const arr = []
    for (const [id, { facts, imageFile, name, wiki }] of records) {
      const pres = presence.get(id) || {}
      const cont = pres.canon && pres.legends ? 'both' : pres.canon ? 'canon' : 'legends'
      arr.push({ id, name, continuity: continuityArray(cont), wiki, imageFile: imageFile || null, ...facts })
    }
    return arr.sort((a, b) => a.id.localeCompare(b.id))
  }

  // Derive facts + continuity for one page from its RAW cache entry — purely
  // local, so any deriveFacts change re-applies on the next run, no API calls.
  const ingest = (id, title, raw) => {
    if (!raw || raw.lead === undefined || !isMember(raw.categories)) return
    const canon = isCanonArticle(raw.categories)
    const fields = parseFields(extractTemplate(raw.lead, template))
    const name = cleanValue(fields.name) || title.replace(/\/Legends$/i, '')
    const wiki = title.replace(/\/Legends$/i, '')
    const summary = extractLead(raw.lead, template)
    const facts = { summary, ...deriveFacts(fields, { id, title, name, categories: raw.categories }) }
    const imageFile = facts.imageFile ?? extractFileTitle(fields.image)
    delete facts.imageFile
    for (const k of Object.keys(facts)) {
      const v = facts[k]
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) delete facts[k]
    }
    const pres = presence.get(id) || { canon: false, legends: false }
    if (canon) pres.canon = true
    else pres.legends = true
    presence.set(id, pres)
    const ex = records.get(id)
    if (!ex || (canon && !ex.canonSeen)) records.set(id, { facts, imageFile, name, wiki, canonSeen: canon })
  }

  if (OPTS.fromCache) {
    const titles = Object.keys(cache).filter((t) => t !== '__v' && cache[t] && cache[t].lead !== undefined)
    log(`rebuilding from cache (offline): ${titles.length} pages`)
    let n = 0
    for (const title of titles) {
      ingest(idFromTitle(title), title, cache[title])
      if (++n % 500 === 0 || n === titles.length) tick('rebuild', n, titles.length, `${typeName}=${records.size}`)
    }
    endTick()
    const entries = buildEntries()
    await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
    await writeJson(OUT_FILE, entries)
    log(`done · ${entries.length} ${typeName} written from cache (no API)`)
    await fs.writeFile(LOG_FILE, logLines.join('\n') + '\n')
    return entries
  }

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
      if (doP) { lastP = now; await writeJson(OUT_FILE, buildEntries()) }
      if (doC) { lastC = now; await writeCache(cache) }
    } finally {
      flushing = false
    }
  }

  let pages = await listTemplateTransclusions(template)
  log(`enumerated ${pages.length} ${template} pages`)
  if (OPTS.canonOnly) pages = pages.filter((p) => !/\/Legends$/i.test(p.title))
  if (OPTS.limit) pages = pages.slice(0, OPTS.limit)

  const revs = await fetchRevisions(pages.map((p) => p.title))

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeJson(OUT_FILE, [])

  let done = 0
  await pool(pages, CONCURRENCY, async ({ title }) => {
    const revid = revs.get(title)
    const id = idFromTitle(title)
    let raw = cache[title]
    try {
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
      tick('parse', done, pages.length, `${typeName}=${records.size} fetched=${stats.fetched} cached=${stats.cached} err=${stats.errors}`)
      flush().catch(() => {})
    }
  })
  endTick()
  await flush(true)
  log(`parsed ${records.size} unique ${typeName} (${stats.fetched} fetched, ${stats.cached} cached, ${stats.errors} errors)`)

  const entries = buildEntries()

  if (OPTS.images) {
    const withImage = [...records.entries()].filter(([, r]) => r.imageFile)
    let seen = 0
    await pool(withImage, CONCURRENCY, async ([id, { imageFile }]) => {
      const dir = path.join(IMAGES_DIR, id)
      try {
        if (await hasPreview(dir)) return
        const info = await resolveImage(imageFile)
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

  await writeJson(OUT_FILE, entries)
  await writeCache(cache)

  const secs = ((Date.now() - started) / 1000).toFixed(1)
  log(
    `done in ${secs}s · fetched=${stats.fetched} cached=${stats.cached} ` +
      `newImages=${stats.images} errors=${stats.errors} · written=${entries.length}`
  )
  await fs.writeFile(LOG_FILE, logLines.join('\n') + '\n')
  return entries
}
