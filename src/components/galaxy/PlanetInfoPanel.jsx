import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { imageForPlanet, getPreviewImage, getPlanetImages } from './planetImages'
import { wikiUrl } from '../../data/wookieepedia'

function Fact({ label, value }) {
  if (!value || value === 'unknown' || value === 'n/a') return null
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b" style={{ borderColor: 'rgba(226,34,34,0.08)' }}>
      <span className="font-sans text-[0.65rem] uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
        {label}
      </span>
      <span className="font-sans text-sm text-right" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

// A group of Wookieepedia-linked chips (affiliation / species / points of interest).
function ChipLinks({ label, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mb-6">
      <div className="font-sans text-[0.65rem] uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <a
            key={t}
            href={wikiUrl(t)}
            target="_blank"
            rel="noreferrer"
            className="font-sans text-xs px-2.5 py-1 rounded-sm hover:opacity-80 transition"
            style={{ background: 'var(--obsidian)', border: '1px solid rgba(226,34,34,0.2)', color: 'var(--text-primary)' }}
          >
            {t} ↗
          </a>
        ))}
      </div>
    </div>
  )
}

// Slide-in panel on the right. Shows authored lore, an impressions slider, and
// planet facts sourced from Wookieepedia (bundled locally in planetFacts.json).
export default function PlanetInfoPanel({ planet, onClose }) {
  const [slide, setSlide] = useState(0)

  const previewUrl = planet ? getPreviewImage(planet.id) || imageForPlanet(planet) : null
  const slides = planet ? [previewUrl, ...getPlanetImages(planet.id)].filter(Boolean) : []
  const goSlide = (dir) => setSlide((i) => (i + dir + slides.length) % slides.length)
  // Facts live on the planet object itself (planets.json). Some are strictly
  // typed now (terrain array, population object, numeric diameter/rotation) so
  // format them back into display strings here.
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

  // Reset to the first slide when the planet changes.
  useEffect(() => {
    setSlide(0)
  }, [planet])

  return (
    <AnimatePresence>
      {planet && (
        <motion.aside
          key={planet.id}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute top-0 right-0 z-[60] h-full w-full sm:w-[26rem] overflow-y-auto p-8 pt-24"
          style={{
            background: 'linear-gradient(to left, rgba(10,10,14,0.97), rgba(10,10,14,0.9))',
            borderLeft: '1px solid rgba(226,34,34,0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-40 flex items-center justify-center font-sans text-sm hover:opacity-80 transition"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              background: 'rgba(10,10,14,0.75)',
              border: '1px solid rgba(226,34,34,0.4)',
              color: 'var(--sith-red)',
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Impressions slider at the very top (Databank style), full-bleed */}
          <div className="relative -mx-8 -mt-24 mb-6 h-60 overflow-hidden">
            <AnimatePresence mode="wait">
              {slides[slide] && (
                <motion.img
                  key={`${planet.id}-${slide}`}
                  src={slides[slide]}
                  alt={planet.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </AnimatePresence>

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(10,10,14,1) 2%, rgba(10,10,14,0.35) 40%, rgba(10,10,14,0.15) 100%)',
              }}
            />

            {slides.length > 1 && (
              <>
                <button
                  onClick={() => goSlide(-1)}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-100 transition"
                  style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(10,10,14,0.6)', border: '1px solid rgba(226,34,34,0.4)', color: '#f0e8e8', opacity: 0.85 }}
                >
                  ‹
                </button>
                <button
                  onClick={() => goSlide(1)}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-100 transition"
                  style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(10,10,14,0.6)', border: '1px solid rgba(226,34,34,0.4)', color: '#f0e8e8', opacity: 0.85 }}
                >
                  ›
                </button>
                <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      aria-label={`Image ${i + 1}`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '9999px',
                        background: i === slide ? 'var(--sith-red)' : 'rgba(240,232,232,0.4)',
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute bottom-4 left-8 right-8 pointer-events-none">
              <div
                className="font-sans text-[0.65rem] uppercase tracking-[0.4em] mb-1"
                style={{ color: 'var(--sith-red)' }}
              >
                {planet.region}
              </div>
              <h2
                className="font-display text-4xl font-black leading-none"
                style={{ color: 'var(--text-primary)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
              >
                {planet.name}
              </h2>
            </div>
          </div>

          <p className="font-serif italic text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {planet.lore}
          </p>

          {/* Facts from Wookieepedia (bundled locally) */}
          <div className="mb-6">
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
            {demographics.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                {demographics.map(([name, pct]) => (
                  <span key={name}>
                    {name} <span style={{ color: 'var(--sith-red)' }}>{pct}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <ChipLinks label="Affiliation" items={facts.affiliation} />
          <ChipLinks label="Native species" items={facts.species} />
          <ChipLinks label="Points of interest" items={facts.pointsOfInterest} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
