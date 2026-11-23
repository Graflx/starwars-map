import React from 'react'
import { Fact, ChipLinks } from '../EntityFacts'
import { getPlanet } from '../../../data/planets'

// Species-specific facts table + chip groups, sourced from Wookieepedia via
// scripts/sync-species.mjs. `homeworldId` is a soft cross-reference into
// planets.json (~80% resolve to a real planet — the rest are systems/legends
// worlds outside the synced set) — falls back to the free-text `homeworld`.
export default function SpeciesFacts({ entity: species }) {
  const facts = species || {}
  const homeworldPlanet = facts.homeworldId ? getPlanet(facts.homeworldId) : null
  const list = (v) => (Array.isArray(v) ? v.join(', ') : v)

  return (
    <>
      <div className="mb-6">
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <caption className="sr-only">Species facts</caption>
          <colgroup>
            <col style={{ width: '40%' }} />
            <col />
          </colgroup>
          <tbody>
            <Fact label="Designation" value={facts.designation} />
            <Fact label="Classification" value={facts.classification} />
            <Fact label="Homeworld" value={homeworldPlanet ? homeworldPlanet.name : facts.homeworld} />
            <Fact label="Height" value={facts.height} />
            <Fact label="Length" value={facts.length} />
            <Fact label="Mass" value={list(facts.mass)} />
            <Fact label="Skin color" value={list(facts.skinColor)} />
            <Fact label="Hair color" value={list(facts.hairColor)} />
            <Fact label="Eye color" value={list(facts.eyeColor)} />
            <Fact label="Distinctions" value={list(facts.distinctions)} />
            <Fact label="Lifespan" value={facts.lifespan} />
            <Fact label="Habitat" value={list(facts.habitat)} />
            <Fact label="Diet" value={list(facts.diet)} />
            <Fact label="Language" value={list(facts.language)} />
          </tbody>
        </table>
      </div>

      <ChipLinks label="Subspecies" items={facts.subspecies} />
    </>
  )
}
