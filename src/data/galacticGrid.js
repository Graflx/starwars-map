// Geometry for the official-map overlays: the labelled sector grid and the
// concentric coloured region bands, on the galactic plane (y = 0).
//
// These mirror the placement in scripts/lib/position.mjs: a planet at grid
// square (col letter, row number) sits at position ((col-L)*CELL, ~0, (row-9)*CELL)
// in planets.json, which the app then scales by SCENE_SCALE. So world units =
// grid-position units × SCENE_SCALE.
import { SCENE_SCALE } from './planets'
import { REGION_COLORS } from './planetFilters'

const CELL = 2.6 // must match position.mjs
const ORIGIN_COL = 'L'.charCodeAt(0) - 65 // 11 → Coruscant column
const ORIGIN_ROW = 9 // Coruscant row

// Grid extent (covers the data range C–V × 1–21 with a small margin).
export const COL_MIN = 1 // B
export const COL_MAX = 22 // W
export const ROW_MIN = 1
export const ROW_MAX = 22

const UNIT = CELL * SCENE_SCALE
// World coordinate of a grid column-line / row-line (fractional grid index).
export const worldX = (col) => (col - ORIGIN_COL) * UNIT
export const worldZ = (row) => (row - ORIGIN_ROW) * UNIT
export const letter = (col) => String.fromCharCode(65 + col)

// Column letters + row numbers to label, with their world positions.
export const COL_LABELS = Array.from({ length: COL_MAX - COL_MIN + 1 }, (_, i) => {
  const col = COL_MIN + i
  return { text: letter(col), x: worldX(col) }
})
export const ROW_LABELS = Array.from({ length: ROW_MAX - ROW_MIN + 1 }, (_, i) => {
  const row = ROW_MIN + i
  return { text: String(row), z: worldZ(row) }
})

// Concentric region bands (radii in grid-position units → ×SCENE_SCALE for
// world). Boundaries bracket each region's radial distribution from the data.
// Embedded regions (Hutt Space, Unknown Regions) aren't rings — colour only.
const BANDS = [
  ['Deep Core', 0, 3.0],
  ['Core Worlds', 3.0, 5.8],
  ['Colonies', 5.8, 8.2],
  ['Inner Rim', 8.2, 11.5],
  ['Expansion Region', 11.5, 15.8],
  ['Mid Rim', 15.8, 19.8],
  ['Outer Rim', 19.8, 28],
  ['Wild Space', 28, 35],
]
export const REGION_BANDS = BANDS.map(([region, r0, r1]) => ({
  region,
  inner: r0 * SCENE_SCALE,
  outer: r1 * SCENE_SCALE,
  color: REGION_COLORS[region],
}))
