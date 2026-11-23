// Wikitext / {{CelestialBody}} infobox parsing helpers.
//
// Wookieepedia planet articles (canon AND legends) use the {{CelestialBody}}
// template. We extract that template's fields from the raw wikitext, strip the
// wiki markup, and classify the planet into one of the app's texture `type`s.

// --- template extraction ------------------------------------------------

// Locate the first {{<name> ... }} template, respecting nested {{ }} and
// [[ ]]. Returns { start, innerStart, innerEnd, end } (all string indices
// into `wikitext`) or null if the template isn't present.
function templateSpan(wikitext, name) {
  if (!wikitext) return null
  const re = new RegExp('\\{\\{\\s*' + name + '\\b', 'i')
  const m = re.exec(wikitext)
  if (!m) return null
  let i = m.index + 2
  let depth = 1
  const innerStart = i
  while (i < wikitext.length && depth > 0) {
    if (wikitext.startsWith('{{', i)) { depth++; i += 2; continue }
    if (wikitext.startsWith('}}', i)) { depth--; i += 2; continue }
    i++
  }
  return { start: m.index, innerStart, innerEnd: i - 2, end: i }
}

// Find the first {{<name> ... }} template and return the raw inner text
// (everything between the template name and the matching closing braces),
// respecting nested {{ }} and [[ ]].
export function extractTemplate(wikitext, name) {
  const span = templateSpan(wikitext, name)
  return span ? wikitext.slice(span.innerStart, span.innerEnd) : null
}

// Remove the first {{<name> ... }} template (the whole block, braces
// included) from wikitext, leaving the surrounding prose untouched.
export function stripTemplate(wikitext, name) {
  const span = templateSpan(wikitext, name)
  if (!span) return wikitext
  return wikitext.slice(0, span.start) + wikitext.slice(span.end)
}

// Split the template inner text into `key=value` pairs on top-level pipes,
// ignoring pipes inside nested {{ }}, [[ ]] or {| |} tables.
export function parseFields(inner) {
  const fields = {}
  if (!inner) return fields
  const parts = []
  let depthCurly = 0
  let depthSquare = 0
  let buf = ''
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2)
    if (two === '{{' || two === '{|') { depthCurly++; buf += two; i++; continue }
    if (two === '}}' || two === '|}') { depthCurly = Math.max(0, depthCurly - 1); buf += two; i++; continue }
    if (two === '[[') { depthSquare++; buf += two; i++; continue }
    if (two === ']]') { depthSquare = Math.max(0, depthSquare - 1); buf += two; i++; continue }
    if (inner[i] === '|' && depthCurly === 0 && depthSquare === 0) { parts.push(buf); buf = ''; continue }
    buf += inner[i]
  }
  parts.push(buf)
  // The first part is the leading text before the first pipe (usually the
  // remnant after the template name) — drop pairs without an "=".
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim().toLowerCase()
    const value = part.slice(eq + 1).trim()
    if (key) fields[key] = value
  }
  return fields
}

// --- markup cleaning -----------------------------------------------------

// Strip a raw field value down to human-readable plain text.
export function cleanValue(raw) {
  if (raw == null) return ''
  let s = String(raw)
  s = s.replace(/<ref[^>]*\/>/gi, '')
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  // Common HTML entities -> plain characters.
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&amp;/g, '&')
  s = s.replace(/\{\{[^{}]*\}\}/g, '') // drop simple templates
  // [[target|label]] -> label ; [[target]] -> target
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]|]+)\]\]/g, '$1')
  s = s.replace(/'''?/g, '')
  s = s.replace(/<[^>]+>/g, '') // any remaining html tags
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/^[*#:\s]+/, '').trim()
  return s
}

// Turn a bullet-list field ("*[[A]]\n*[[B]]") into a de-duped array.
export function toList(raw) {
  if (raw == null) return []
  const chunks = String(raw)
    .split(/\n?\s*[*#]\s*/)
    .map((c) => cleanValue(c))
    .filter(Boolean)
  // If there were no bullets it's a single value.
  const out = chunks.length ? chunks : [cleanValue(raw)].filter(Boolean)
  return [...new Set(out)]
}

// Plain-text summary from an article's opening prose — the infobox template
// stripped out, remaining simple templates/markup cleaned. This is the
// shared `summary` field for types without a rich facts panel (people,
// films, books, games); `wikitext` should be the page's lead section
// (everything before the first == heading), same input as extractTemplate.
export function extractLead(wikitext, templateName) {
  if (!wikitext) return ''
  const withoutInfobox = templateName ? stripTemplate(wikitext, templateName) : wikitext
  return cleanValue(withoutInfobox)
}

// --- classification ------------------------------------------------------

const TYPE_RULES = [
  [/(ice|frozen|frigid|arctic|glacial|snow|tundra)/i, 'ice'],
  [/(volcan|lava|molten|magma)/i, 'lava'],
  [/(desert|arid|barren|dune|wastes?)/i, 'desert'],
  [/(ocean|aquatic|water world|sea|archipelago)/i, 'ocean'],
  [/(swamp|bog|marsh|fen|mire)/i, 'swamp'],
  [/(forest|jungle|tropical|woodland|verdant)/i, 'forest'],
  [/(gas giant|gaseous|gas dwarf)/i, 'gas'],
  [/(city|urban|ecumenopolis|metropolis|industrial)/i, 'terran'],
  [/(rock|mountain|canyon|crater|rugged|terrestrial)/i, 'rock'],
  [/(grass|plain|temperate|garden|jungle|savanna|meadow)/i, 'terran'],
]

// Choose a texture `type` (a key of TYPE_SETS in planetImages.js) from the
// planet's climate / class / terrain text.
export function classifyType({ climate = '', class: cls = '', terrain = '' } = {}) {
  const hay = `${cls} ${climate} ${terrain}`.toLowerCase()
  for (const [re, type] of TYPE_RULES) {
    if (re.test(hay)) return type
  }
  return 'rock'
}

// A muted glow colour per type (used for the halo + textureless sphere tint).
export const TYPE_COLOR = {
  ice: '#bfe4f2',
  lava: '#e2603a',
  desert: '#d8b877',
  ocean: '#5aa6d8',
  swamp: '#8fa15a',
  forest: '#6fb56a',
  gas: '#c8a06a',
  terran: '#9fc98f',
  rock: '#b09a86',
}
