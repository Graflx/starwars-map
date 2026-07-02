// AUTO-DISCOVERY of planet imagery. Every file under assets/planets/{types,worlds}
// is picked up automatically at build time via webpack's require.context — there
// is no manifest and no manual import list. Just drop files into the folders:
//
//   assets/planets/types/<type>/{base,bump,clouds,rough,normal}.*   → fallback textures
//   assets/planets/worlds/<id>/{base,bump,clouds,rough,normal,light}.* → 3D sphere textures
//   assets/planets/worlds/<id>/preview.*                            → info-panel hero image
//   assets/planets/worlds/<id>/images/<n>.*                         → impressions gallery
//
// The nightly sync (scripts/sync-planets.mjs) downloads each planet's image to
// assets/planets/worlds/<id>/preview.* so it appears here with no code change.

// filename (without extension) → three.js material map key
const SUFFIX_TO_KEY = {
  base: 'map',
  bump: 'bumpMap',
  clouds: 'clouds',
  rough: 'roughnessMap',
  normal: 'normalMap',
  light: 'emissiveMap',
}

const typesCtx = require.context('../../assets/planets/types', true, /\.(png|jpe?g|webp)$/)
const worldsCtx = require.context('../../assets/planets/worlds', true, /\.(png|jpe?g|webp)$/)

const TYPE_SETS = {} // type -> { map, bumpMap, clouds, ... }
const WORLD_SETS = {} // id -> { map, bumpMap, clouds, ... }
const PREVIEWS = {} // id -> url
const PLANET_IMAGES = {} // id -> [url, ...] (gallery, ordered)

const set = (obj, key) => (obj[key] || (obj[key] = {}))

for (const key of typesCtx.keys()) {
  const m = /^\.\/([^/]+)\/([^/.]+)\.(?:png|jpe?g|webp)$/.exec(key)
  if (!m) continue
  const mapKey = SUFFIX_TO_KEY[m[2]]
  if (mapKey) set(TYPE_SETS, m[1])[mapKey] = typesCtx(key)
}

const galleries = {} // id -> [{ n, url }]
for (const key of worldsCtx.keys()) {
  let m
  if ((m = /^\.\/([^/]+)\/preview\.(?:png|jpe?g|webp)$/.exec(key))) {
    PREVIEWS[m[1]] = worldsCtx(key)
  } else if ((m = /^\.\/([^/]+)\/images\/(\d+)\.(?:png|jpe?g|webp)$/.exec(key))) {
    ;(galleries[m[1]] || (galleries[m[1]] = [])).push({ n: +m[2], url: worldsCtx(key) })
  } else if ((m = /^\.\/([^/]+)\/([^/.]+)\.(?:png|jpe?g|webp)$/.exec(key))) {
    const mapKey = SUFFIX_TO_KEY[m[2]]
    if (mapKey) set(WORLD_SETS, m[1])[mapKey] = worldsCtx(key)
  }
}
for (const id of Object.keys(galleries)) {
  PLANET_IMAGES[id] = galleries[id].sort((a, b) => a.n - b.n).map((x) => x.url)
}

export function getPlanetMaterial(planet) {
  return { ...(TYPE_SETS[planet.type] || {}), ...(WORLD_SETS[planet.id] || {}) }
}
export const imageForPlanet = (planet) => getPlanetMaterial(planet).map || null
export const getPreviewImage = (id) => PREVIEWS[id] || null
export const getPlanetImages = (id) => PLANET_IMAGES[id] || []
export const hasWorldTextures = (id) => !!(WORLD_SETS[id] && Object.keys(WORLD_SETS[id]).length)
