// Travel routes of the Sith Lords as a time-and-place model.
//
// SWAPI has no travel routes — these paths are authored and thematically drawn
// from the films / Legends lore. Each lord has a list of `appearances` of known
// stops: { planetId, year, label }.
//   - planetId references galaxy.js
//   - year: negative = BBY (before the Battle of Yavin), positive = ABY (after),
//     0 = Battle of Yavin. Smaller number = earlier.
//   - label: short description of the stop (tooltip / timeline)
// appearances MUST be sorted chronologically (ascending by year).
// `sithId` matches the ids from sithLords.js; `color` = lord color for path/legend.

export const sithRoutes = [
  {
    sithId: 'vader',
    color: '#E22222',
    label: 'Anakin\'s Fall & Vader\'s Hunt',
    appearances: [
      { planetId: 'tatooine', year: -32, label: 'Slave child on Tatooine' },
      { planetId: 'geonosis', year: -22, label: 'Start of the Clone Wars' },
      { planetId: 'coruscant', year: -19, label: 'Seduction by Palpatine' },
      { planetId: 'mustafar', year: -19, label: 'Rebirth as Darth Vader' },
      { planetId: 'bespin', year: 3, label: 'Trap in Cloud City' },
      { planetId: 'endor', year: 4, label: 'Redemption & death' },
    ],
  },
  {
    sithId: 'maul',
    color: '#ff5a2a',
    label: 'The Wrath of the Beast',
    appearances: [
      { planetId: 'dathomir', year: -54, label: 'Born among the Nightsisters' },
      { planetId: 'coruscant', year: -33, label: 'Apprentice at Sidious’ side' },
      { planetId: 'tatooine', year: -32, label: 'Hunt for the Queen' },
      { planetId: 'naboo', year: -32, label: 'Duel of the Fates' },
    ],
  },
  {
    sithId: 'sidious',
    color: '#c026d3',
    label: 'The Puppet Master\'s Threads',
    appearances: [
      { planetId: 'naboo', year: -65, label: 'Born as Palpatine' },
      { planetId: 'coruscant', year: -32, label: 'Rise to Chancellor' },
      { planetId: 'endor', year: 4, label: 'Fall over the forest moon' },
      { planetId: 'byss', year: 10, label: 'Return in clone bodies' },
    ],
  },
  {
    sithId: 'revan',
    color: '#a855f7',
    label: 'Search for the Star Forge',
    appearances: [
      { planetId: 'malachor-v', year: -3960, label: 'Mandalorian Wars' },
      { planetId: 'dantooine', year: -3957, label: 'Enclave of the Jedi' },
      { planetId: 'korriban', year: -3956, label: 'Trials in the Valley of the Lords' },
      { planetId: 'coruscant', year: -3954, label: 'Return to the light' },
    ],
  },
  {
    sithId: 'bane',
    color: '#f97316',
    label: 'The Birth of the Rule of Two',
    appearances: [
      { planetId: 'korriban', year: -1003, label: 'Study of the ancient Sith' },
      { planetId: 'dantooine', year: -1002, label: 'Brotherhood of Darkness' },
      { planetId: 'dromund-kaas', year: -1001, label: 'Retreat into the Sith Empire' },
      { planetId: 'coruscant', year: -1000, label: 'The Rule of Two is born' },
    ],
  },
  {
    sithId: 'plagueis',
    color: '#e879f9',
    label: 'The Path of the Wise',
    appearances: [
      { planetId: 'ziost', year: -200, label: 'Ancient Sith records' },
      { planetId: 'dromund-kaas', year: -120, label: 'Study of immortality' },
      { planetId: 'byss', year: -67, label: 'Experiments on the midi-chlorians' },
      { planetId: 'naboo', year: -34, label: 'Muun banking dealings' },
      { planetId: 'coruscant', year: -32, label: 'Betrayal by the apprentice' },
    ],
  },
]

export const getRoute = (sithId) => sithRoutes.find((r) => r.sithId === sithId)

// All appearance years (ascending, unique) across all routes — the basis for the
// ordinally spaced but truthfully labeled timeline axis.
export const allYears = [
  ...new Set(sithRoutes.flatMap((r) => r.appearances.map((a) => a.year))),
].sort((a, b) => a - b)

// Linear time axis with REAL spacing: 1 year = fixed pixel width (the handle
// position t ∈ [0,1] is proportional to the real year). Large gaps
// (Revan ~3960 BBY) therefore appear large too, dense film eras appear dense.
export const yearMin = allYears[0]
export const yearMax = allYears[allYears.length - 1]
const yearSpan = yearMax - yearMin || 1

// t ∈ [0,1] → real year.
export function tToYear(t) {
  return yearMin + Math.min(Math.max(t, 0), 1) * yearSpan
}

// Real year → position t ∈ [0,1] on the linear axis.
export function yearToT(year) {
  return (year - yearMin) / yearSpan
}

// Year → label. Negative = BBY, positive = ABY, 0 = Battle of Yavin.
export function formatYear(year) {
  const y = Math.round(year)
  if (y === 0) return 'Battle of Yavin'
  return y < 0 ? `${-y} BBY` : `${y} ABY`
}
