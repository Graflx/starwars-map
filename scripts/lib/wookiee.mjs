// Minimal, polite Wookieepedia (Fandom / MediaWiki) API client.
//
// Node 18+ has a global fetch, so there are no dependencies. Fandom requires a
// descriptive User-Agent; we also rate-limit and back off so we never hammer
// the API. Every planet page (canon AND legends) transcludes {{CelestialBody}},
// so `list=embeddedin` on that template enumerates them all.

const API = 'https://starwars.fandom.com/api.php'
const UA =
  'sith-lords-planet-sync/1.0 (local build tool; contact: brunner.felix.02@outlook.de)'

// Slot-reservation rate limiter — correct under concurrency: each caller
// atomically reserves the next time slot, so N in-flight requests stay spaced
// REQ_GAP_MS apart overall (~14 req/s) while their network latency overlaps.
const REQ_GAP_MS = 70

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let nextSlot = 0
async function throttle() {
  const now = Date.now()
  const slot = Math.max(now, nextSlot)
  nextSlot = slot + REQ_GAP_MS
  const wait = slot - now
  if (wait > 0) await sleep(wait)
}

// Low-level GET against the API with retry + exponential backoff.
export async function apiGet(params, { retries = 4 } = {}) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  const url = `${API}?${qs}`
  for (let attempt = 0; ; attempt++) {
    await throttle()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(`API error: ${json.error.code} ${json.error.info || ''}`)
      return json
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(500 * 2 ** attempt)
    }
  }
}

// Enumerate every namespace-0 page that transcludes a given template.
export async function listTemplateTransclusions(template) {
  const pages = []
  let cont
  do {
    const json = await apiGet({
      action: 'query',
      list: 'embeddedin',
      eititle: `Template:${template}`,
      einamespace: '0',
      eilimit: '500',
      ...(cont ? { eicontinue: cont } : {}),
    })
    for (const p of json.query?.embeddedin || []) pages.push({ pageid: p.pageid, title: p.title })
    cont = json.continue?.eicontinue
  } while (cont)
  return pages
}

// Batch-fetch latest revision ids for up to 50 titles at a time. Lets the sync
// skip re-parsing pages that haven't changed since the last run.
export async function fetchRevisions(titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const json = await apiGet({
      action: 'query',
      titles: batch.join('|'),
      prop: 'revisions',
      rvprop: 'ids',
    })
    for (const p of json.query?.pages || []) {
      if (p.revisions?.[0]?.revid) out.set(p.title, p.revisions[0].revid)
    }
  }
  return out
}

// Fetch a page's lead wikitext + categories + revision id in one call.
export async function fetchPage(title) {
  const json = await apiGet({
    action: 'parse',
    page: title,
    prop: 'wikitext|categories|revid',
    redirects: '1',
  })
  const p = json.parse
  if (!p) return null
  return {
    title: p.title,
    revid: p.revid,
    wikitext: p.wikitext ?? p.wikitext?.['*'] ?? '',
    categories: (p.categories || []).map((c) => (typeof c === 'string' ? c : c.category || c['*'] || '')),
  }
}

// Resolve a "File:Foo.png" title to its real CDN url + mime.
export async function resolveImage(fileTitle) {
  const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`
  const json = await apiGet({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
  })
  const pages = json.query?.pages || []
  const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0]
  const info = page?.imageinfo?.[0]
  if (!info?.url) return null
  return { url: info.url, mime: info.mime, width: info.width, height: info.height }
}

// Download binary content to a Buffer (with the same UA + retry policy).
export async function download(url, { retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(500 * 2 ** attempt)
    }
  }
}
