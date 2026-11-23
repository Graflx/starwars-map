// Central registry every generic UI piece (EntityInfoPanel, and later the
// Timeline/Codex/universal search) reads from instead of hardcoding a
// per-type switch. Adding a new content type (starships, people, ...) means
// adding one entry here plus its <Type>Facts.jsx — nothing else needs to
// know the type exists.
import { getPlanet, inContinuity as inPlanetContinuity } from './planets'
import { getSpecies, inContinuity as inSpeciesContinuity } from './species'
import PlanetFacts from '../components/galaxy/entityPanels/PlanetFacts'
import SpeciesFacts from '../components/galaxy/entityPanels/SpeciesFacts'
import { imageForPlanet, getPreviewImage, getPlanetImages } from '../components/galaxy/planetImages'
import { getSpeciesPreview, getSpeciesGallery } from '../components/galaxy/speciesImages'

export const entityTypes = {
  planet: {
    key: 'planet',
    label: 'Planet',
    color: '#4fb3ff',
    icon: '🪐',
    getEntity: getPlanet,
    // Planets pre-date `summary` (see scripts/README.md) — the italic intro
    // paragraph reads from `lore`, which today is unset for every synced
    // planet. Left as-is: fixing that gap is a planet-data concern, not part
    // of the entity-type generalization.
    eyebrow: (p) => p.region,
    description: (p) => p.lore,
    getPreview: (id) => getPreviewImage(id) || imageForPlanet({ id, type: getPlanet(id)?.type }),
    getGallery: getPlanetImages,
    FactsComponent: PlanetFacts,
    inContinuity: inPlanetContinuity,
  },
  species: {
    key: 'species',
    label: 'Species',
    color: '#7fd48f',
    icon: '🧬',
    getEntity: getSpecies,
    eyebrow: (s) => s.classification || s.designation,
    description: (s) => s.summary,
    getPreview: getSpeciesPreview,
    getGallery: getSpeciesGallery,
    FactsComponent: SpeciesFacts,
    inContinuity: inSpeciesContinuity,
  },
}

export const getEntity = (type, id) => entityTypes[type]?.getEntity(id) ?? null
