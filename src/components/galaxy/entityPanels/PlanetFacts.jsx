import React from 'react'
import { Fact, ChipLinks } from '../EntityFacts'

// Planet-specific facts table + chip groups, sourced from Wookieepedia
// (bundled locally in planets.json). Extracted as-is from the pre-refactor
// PlanetInfoPanel.jsx so planet rendering stays byte-for-byte identical.
export default function PlanetFacts({ entity: planet }) {
  const facts = planet || {}
  const terrain = Array.isArray(facts.terrain) ? facts.terrain.join(', ') : facts.terrain
  const diameter =
    typeof facts.diameter === 'number' ? `${facts.diameter.toLocaleString('en-US')} km` : facts.diameter
  const rotation =
    typeof facts.rotation === 'number' ? `${facts.rotation} standard hours` : facts.rotation
  const pop = facts.population
  const popObject = pop && typeof pop === 'object'
  const population = popObject ? (pop.total != null ? pop.total.toLocaleString('en-US') : null) : pop
  const demographics = popObject && pop.demographics ? Object.entries(pop.demographics) : []

  return (
    <>
      <div className="mb-6">
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <caption className="sr-only">Planet facts</caption>
          <colgroup>
            <col style={{ width: '40%' }} />
            <col />
          </colgroup>
          <tbody>
            <Fact label="Region" value={facts.region} />
            <Fact label="Sector" value={facts.sector} />
            <Fact label="System" value={facts.system} />
            <Fact label="Class" value={facts.class} />
            <Fact label="Climate" value={facts.climate} />
            <Fact label="Terrain" value={terrain} />
            <Fact label="Atmosphere" value={facts.atmosphere} />
            <Fact label="Gravity" value={facts.gravity} />
            <Fact label="Surface water" value={facts.water} />
            <Fact label="Diameter" value={diameter} />
            <Fact label="Rotation period" value={rotation} />
            <Fact label="Orbital period" value={facts.orbital} />
            <Fact label="Population" value={population} />
          </tbody>
        </table>
        {demographics.length > 0 && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
            {demographics.map(([name, pct]) => (
              <span key={name}>
                {name} <span style={{ color: 'var(--sith-red)' }}>{pct}%</span>
              </span>
            ))}
          </p>
        )}
      </div>

      <ChipLinks label="Affiliation" items={facts.affiliation} />
      <ChipLinks label="Native species" items={facts.species} />
      <ChipLinks label="Points of interest" items={facts.pointsOfInterest} />
    </>
  )
}
