#!/usr/bin/env node
// Species sync — first of the 8 new content types, built to validate the
// generic scripts/lib/sync-runner.mjs harness end-to-end (enumeration,
// caching, cross-type references) before the larger/messier types.
//
// Every species article (canon + legends) transcludes {{Species}}. Writes
// src/data/species.json and downloads one thumbnail per species into
// src/assets/species/<id>/preview.* (see scripts/README.md for the shared
// image/id conventions every sync-<type>.mjs script follows).
//
// Usage: node scripts/sync-species.mjs [--limit N] [--no-images] [--canon-only]

import { runSync } from './lib/sync-runner.mjs'
import { cleanValue, toList } from './lib/infobox.mjs'
import { idFromTitle } from './lib/ids.mjs'

// Wiki categories use underscores ("Sentient_species_of_Endor") — normalise, then test.
function isSpecies(categories) {
  const cats = categories.map((c) => c.toLowerCase().replace(/_/g, ' '))
  return cats.some((c) => /\bspecies\b/.test(c))
}

// A species' `origin` field is usually a single planet wikilink ("[[Endor]]")
// but can be a bullet list ("multiple worlds") or narrative text ("Unknown").
// Only resolve homeworldId when it unambiguously names one planet — anything
// else stays a free-text `homeworld` string for display only.
function resolveHomeworld(rawOrigin) {
  const origins = toList(rawOrigin)
  const homeworld = cleanValue(rawOrigin)
  if (origins.length === 1 && origins[0] && origins[0].toLowerCase() !== 'unknown') {
    return { homeworld, homeworldId: idFromTitle(origins[0]) }
  }
  return { homeworld: homeworld || null, homeworldId: null }
}

function deriveFacts(fields) {
  return {
    designation: cleanValue(fields.designation),
    classification: cleanValue(fields.class),
    subspecies: toList(fields.subspecies),
    ...resolveHomeworld(fields.origin),
    height: cleanValue(fields.height),
    length: cleanValue(fields.length),
    mass: toList(fields.mass),
    skinColor: toList(fields.skincolor),
    hairColor: toList(fields.haircolor),
    eyeColor: toList(fields.eyecolor),
    distinctions: toList(fields.distinctions),
    lifespan: cleanValue(fields.lifespan),
    habitat: toList(fields.habitat),
    diet: toList(fields.diet),
    language: toList(fields.language),
  }
}

await runSync({
  typeName: 'species',
  template: 'Species',
  outFile: 'src/data/species.json',
  imagesDir: 'src/assets/species',
  isMember: isSpecies,
  deriveFacts,
})
