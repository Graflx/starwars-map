// Central planet-filter definitions + predicate, shared by the FilterPanel UI,
// the GalaxyScene (what to render) and GalaxyMap (the "N worlds shown" count).
import { inContinuity } from './planets'
import { isFamous } from './famousWorlds'

// Canonical galactic regions, inner → outer. Data has duplicates like
// "Mid Rim Territories" / "Inner Rim Territories" → strip the suffix.
export const REGION_OPTIONS = [
  'Deep Core',
  'Core Worlds',
  'Colonies',
  'Inner Rim',
  'Expansion Region',
  'Mid Rim',
  'Outer Rim',
  'Wild Space',
  'Hutt Space',
  'Unknown Regions',
]
export const normalizeRegion = (r) => (r ? r.replace(/\s+Territories$/i, '').trim() : null)

// One region → colour map, reused by the map's coloured region bands AND the
// region filter chips (warm core → cool rim, like the official galaxy map).
export const REGION_COLORS = {
  'Deep Core': '#f4e8c1',
  'Core Worlds': '#f2c14e',
  Colonies: '#a3d977',
  'Inner Rim': '#5bbf9b',
  'Expansion Region': '#4aa3c7',
  'Mid Rim': '#5b7fc7',
  'Outer Rim': '#7a6bc4',
  'Wild Space': '#8a7f9e',
  'Hutt Space': '#c78a4a',
  'Unknown Regions': '#6b6f7a',
}

// Texture types (planet.type) with friendlier labels.
export const TYPE_OPTIONS = [
  { id: 'terran', label: 'Terran' },
  { id: 'forest', label: 'Forest' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'desert', label: 'Desert' },
  { id: 'ice', label: 'Ice' },
  { id: 'lava', label: 'Volcanic' },
  { id: 'swamp', label: 'Swamp' },
  { id: 'gas', label: 'Gas giant' },
  { id: 'rock', label: 'Rocky' },
]

// Factions match against the planet.affiliation array (exact strings from wiki).
export const FACTION_OPTIONS = [
  { id: 'Galactic Empire', label: 'Galactic Empire' },
  { id: 'Galactic Republic', label: 'Galactic Republic' },
  { id: 'New Republic', label: 'New Republic' },
  { id: 'Confederacy of Independent Systems', label: 'Separatists (CIS)' },
  { id: 'Alliance to Restore the Republic', label: 'Rebel Alliance' },
  { id: 'First Order', label: 'First Order' },
  { id: 'Sith Empire', label: 'Sith Empire' },
  { id: 'Jedi Order', label: 'Jedi Order' },
]

// A planet passes when it matches EVERY active dimension. An empty set for a
// dimension means "no restriction" on it.
export function matchesFilters(p, f) {
  if (!inContinuity(p, f.continuity)) return false
  if (f.famousOnly && !isFamous(p.id)) return false
  if (f.regions.size && !f.regions.has(normalizeRegion(p.region))) return false
  if (f.types.size && !f.types.has(p.type)) return false
  if (f.factions.size && !(p.affiliation || []).some((a) => f.factions.has(a))) return false
  return true
}

export const hasActiveFilters = (f) => f.regions.size || f.types.size || f.factions.size
