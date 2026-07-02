// Strict typing of raw infobox strings into the shapes planets.json stores.

// "R-16" -> ["R", 16] ; null if not a grid square.
export function coordPair(raw) {
  if (!raw) return null
  const m = /([A-Za-z])\s*[-–]\s*(\d{1,2})/.exec(String(raw))
  return m ? [m[1].toUpperCase(), parseInt(m[2], 10)] : null
}

// "12,120 kilometers" / "9,380 km" -> 12120 (number, km only). Otherwise keep
// the original string (e.g. non-km units, "unknown"). Null if empty.
export function diameterValue(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw)
  const num = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (num && /kilomet|(?:^|[\s\d])km\b/i.test(s)) return parseFloat(num[1])
  return s.trim() || null
}

// "26 standard hours" -> 26 (float). No number -> original string. Null if empty.
export function toFloat(raw) {
  if (raw == null || raw === '') return null
  const m = String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : String(raw).trim()
}

// 'both' -> ['canon','legends'] ; 'canon' -> ['canon'] ; etc.
export function continuityArray(c) {
  if (c === 'both') return ['canon', 'legends']
  return c ? [c] : ['legends']
}

const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 }
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

// "850,000: **97% Aqualish **2% Human **1% other"
//   -> { total: 850000, demographics: { Aqualish: 97, Human: 2, Other: 1 } }
// "4.5 billion: 72% Gungan ..." handles scale words. Narrative text with no
// number is kept as the original string.
export function parsePopulation(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw)

  // Total: the first number that is NOT part of a percentage or a "68–78%"
  // range (those are demographics). Many planets list only percentages and
  // have no total at all -> total stays null.
  let total = null
  const totalRe = /(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|trillion)?/gi
  let tm
  while ((tm = totalRe.exec(s))) {
    const rest = s.slice(tm.index + tm[0].length)
    if (/^\s*(%|[–—-]\s*\d)/.test(rest)) continue // a percentage / range bound
    total = parseFloat(tm[1].replace(/,/g, ''))
    const scale = tm[2] && SCALE[tm[2].toLowerCase()]
    if (scale) total *= scale
    total = Math.round(total)
    break
  }

  const demographics = {}
  const re = /(\d+(?:\.\d+)?)\s*%\s*([A-Za-z][A-Za-z '-]*?)(?=\s*(?:\*|\d+(?:\.\d+)?\s*%|$))/g
  let m
  while ((m = re.exec(s))) {
    const name = titleCase(m[2].trim().replace(/\s+/g, ' '))
    if (name) demographics[name] = parseFloat(m[1])
  }

  if (total == null && Object.keys(demographics).length === 0) return s.trim()
  return { total, demographics }
}
