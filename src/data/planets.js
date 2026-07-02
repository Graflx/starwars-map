// Single source of truth for every planet: map placement (position, size,
// colour, type), continuity, authored lore AND the Wookieepedia facts — all in
// src/data/planets.json. Regenerated / extended nightly by scripts/sync-planets.mjs.
//
// Only planets with a map position are exposed as `planets` (the 3D scene and
// search render these). Facts-only planets without a grid square live in the
// JSON but aren't placed on the map.
import raw from './planets.json'

// The grid-derived positions in planets.json are compact (~±40). With every
// planet drawn at its true size the galaxy would overlap into one clump, so we
// spread the whole scene out by a constant factor here (camera distances + star
// radius in GalaxyScene are matched to this). Sizes are NOT scaled.
export const SCENE_SCALE = 3.5

const scalePos = (p) =>
  Array.isArray(p.position)
    ? { ...p, position: [p.position[0] * SCENE_SCALE, p.position[1] * SCENE_SCALE, p.position[2] * SCENE_SCALE] }
    : p

export const allPlanets = raw.map(scalePos)
export const planets = allPlanets.filter((p) => Array.isArray(p.position))

export const getPlanet = (id) => allPlanets.find((p) => p.id === id)

// Continuity is an array, e.g. ['canon','legends'] | ['canon'] | ['legends'].
export const getContinuity = (p) =>
  Array.isArray(p.continuity) ? p.continuity : p.continuity ? [p.continuity] : ['legends']

// Is a world shown in the given mode ('canon' | 'legends')?
export const inContinuity = (p, mode) => getContinuity(p).includes(mode)

// ThreeJS sphere size derived from the planet's diameter (km). `size` is no
// longer stored — it's computed here. Cube-root scaling keeps giants from
// dwarfing everything; clamped to a sensible visual range. Unknown -> ~1.
export function planetSize(planet) {
  const d = typeof planet.diameter === 'number' ? planet.diameter : 0
  if (!d) return 0.5 // unknown diameter (many bulk worlds) → small, not medium
  const s = Math.cbrt(d / 12000) * 0.75
  return Math.max(0.32, Math.min(1.25, Math.round(s * 100) / 100))
}
