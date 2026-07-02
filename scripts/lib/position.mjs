// Map placement from Star Wars galactic coordinates.
//
// Reality check (verified against the wiki): the exact `xyz` infobox field is
// RARE — even Tatooine / Hoth / Dagobah have none, only a Standard Galactic
// Grid square like "R-16". The grid IS the canonical, near-universal in-universe
// coordinate, so it is our primary placement source; `xyz` (when present) is
// stored as data but the grid keeps the whole map in one consistent frame.
//
// Grid: a letter (column) and a number (row). Coruscant sits at "L-9" and is
// the galactic origin, so we calibrate the grid centre there and scale cells so
// the spread matches the existing curated layout (~±40 units). The galaxy is a
// flat disc, so y≈0 with a little deterministic jitter for depth.

const ORIGIN_LETTER = 'L'.charCodeAt(0) - 65 // 11
const ORIGIN_NUMBER = 9
const CELL = 2.6 // units per grid square

// Parse a grid square such as "L-9", "O-17", "Grid square R-16" -> {col,row}.
export function parseGrid(raw) {
  if (!raw) return null
  const m = /([A-Z])\s*[-–]\s*(\d{1,2})/i.exec(String(raw))
  if (!m) return null
  return { col: m[1].toUpperCase().charCodeAt(0) - 65, row: parseInt(m[2], 10) }
}

// Parse a raw "xyz" field ("334.93, -706.96, 7.61") -> [x,y,z] or null.
export function parseXyz(raw) {
  if (!raw) return null
  const nums = String(raw).match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length < 3) return null
  return nums.slice(0, 3).map(Number)
}

// Stable per-id pseudo-random in [-1, 1] (no Math.random → deterministic runs).
function hashUnit(id, salt) {
  let h = 2166136261 ^ salt
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1
}

// Compute a [x,y,z] map position. Grid is primary; returns null when the planet
// has no grid square (it then lives only in the facts panel, not on the map).
export function computePosition(id, gridRaw) {
  const grid = parseGrid(gridRaw)
  if (!grid) return null
  // Wide in-cell jitter (0.85 of a cell) so the many planets sharing a grid
  // square scatter across it instead of piling up at the centre; a bit of extra
  // vertical spread further separates same-column worlds.
  const x = (grid.col - ORIGIN_LETTER) * CELL + hashUnit(id, 1) * CELL * 0.85
  const z = (grid.row - ORIGIN_NUMBER) * CELL + hashUnit(id, 2) * CELL * 0.85
  const y = hashUnit(id, 3) * 5
  return [round(x), round(y), round(z)]
}

const round = (n) => Math.round(n * 10) / 10
