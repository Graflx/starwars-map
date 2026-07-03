import React, { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { imageForPlanet, getPreviewImage, getPlanetImages } from './planetImages'
import { wikiUrl } from '../../data/wookieepedia'

// One label/value row of the facts table.
function Fact({ label, value }) {
  if (!value || value === 'unknown' || value === 'n/a') return null
  return (
    <tr className="border-b" style={{ borderColor: 'rgba(226,34,34,0.08)' }}>
      <th
        scope="row"
        className="font-sans text-[0.65rem] uppercase tracking-[0.2em] text-left font-normal py-1.5 pr-4"
        style={{ color: 'var(--text-dim)' }}
      >
        {label}
      </th>
      <td className="font-sans text-sm text-right py-1.5" style={{ color: 'var(--text-primary)' }}>
        {value}
      </td>
    </tr>
  )
}

// A group of Wookieepedia-linked chips (affiliation / species / points of interest).
function ChipLinks({ label, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="font-sans text-[0.65rem] uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--text-dim)' }}>
        {label}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((t) => (
          <li key={t}>
            <a
              href={wikiUrl(t)}
              target="_blank"
              rel="noreferrer"
              className="font-sans text-xs px-2.5 py-1 rounded-sm hover:opacity-80 transition inline-block"
              style={{ background: 'var(--obsidian)', border: '1px solid rgba(226,34,34,0.2)', color: 'var(--text-primary)' }}
            >
              {t} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens Wookieepedia in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Slide-in panel on the right. Shows authored lore, an impressions slider, and
// planet facts sourced from Wookieepedia (bundled locally in planetFacts.json).
export default function PlanetInfoPanel({ planet, onClose, openerRef, fallbackFocusRef }) {
  const [slide, setSlide] = useState(0)
  const swiperRef = useRef(null)
  const panelRef = useRef(null)
  const titleId = useId()
  const loreId = useId()

  const previewUrl = planet ? getPreviewImage(planet.id) || imageForPlanet(planet) : null
  const slides = planet ? [previewUrl, ...getPlanetImages(planet.id)].filter(Boolean) : []
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

  // Return focus to whatever opened the panel (captured by the caller before
  // anything could unmount) — falling back to a stable page anchor if that
  // element is no longer around (e.g. a search result inside the FilterPanel,
  // which closes itself the moment a planet is picked).
  const handleClose = () => {
    onClose()
    const opener = openerRef?.current
    if (opener && document.body.contains(opener) && typeof opener.focus === 'function') {
      opener.focus({ preventScroll: true })
    } else {
      fallbackFocusRef?.current?.focus({ preventScroll: true })
    }
  }

  // Reset to the first slide when the planet changes and move focus into the panel.
  useEffect(() => {
    if (!planet) return
    setSlide(0)
    swiperRef.current?.slideTo(0, 0)
    // preventScroll: true — without it, focusing the panel while it's still
    // mid slide-in (positioned off-screen at x:100% until the spring settles)
    // makes the browser's default "scroll the newly-focused element into
    // view" kick in, which scrolls <main> horizontally by the panel's own
    // width and back — the map briefly jumps left as a side effect.
    panelRef.current?.focus({ preventScroll: true })
  }, [planet])

  return (
    <AnimatePresence>
      {planet && (
        <motion.aside
          // No per-planet key: this is the single conditional child AnimatePresence
          // tracks here, so switching from one planet to another while the panel
          // is already open re-renders it in place (content just swaps). Keying
          // by planet.id would make AnimatePresence treat every switch as "this
          // element left, a new one arrived" — exit-animating the old aside while
          // enter-animating a new one over it, briefly overlapping two <aside>s.
          ref={panelRef}
          aria-labelledby={titleId}
          aria-describedby={loreId}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              handleClose()
            }
          }}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute top-0 right-0 z-[60] h-full w-full sm:w-[26rem] overflow-y-auto p-8 pt-24"
          style={{
            background: 'linear-gradient(to left, rgba(10,10,14,0.97), rgba(10,10,14,0.9))',
            borderLeft: '1px solid rgba(226,34,34,0.25)',
            backdropFilter: 'blur(8px)',
            outline: 'none',
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-40 flex items-center justify-center font-sans text-sm hover:opacity-80 transition"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              background: 'rgba(10,10,14,0.75)',
              border: '1px solid rgba(226,34,34,0.4)',
              color: 'var(--sith-red)',
            }}
            aria-label="Close planet details"
          >
            <span aria-hidden="true">✕</span>
          </button>

          {/* Impressions slider at the very top (Databank style), full-bleed */}
          <div className="relative -mx-8 -mt-24 mb-6 h-60 overflow-hidden">
            <Swiper
              onSwiper={(s) => (swiperRef.current = s)}
              onSlideChange={(s) => setSlide(s.realIndex)}
              loop={slides.length > 1}
              className="absolute inset-0 w-full h-full"
              aria-label={`${planet.name} imagery`}
            >
              {slides.map((src, i) => (
                <SwiperSlide key={`${planet.id}-${i}`}>
                  <img src={src} alt={`${planet.name} — image ${i + 1} of ${slides.length}`} className="w-full h-full object-cover" />
                </SwiperSlide>
              ))}
            </Swiper>

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
                  onClick={() => swiperRef.current?.slidePrev()}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center hover:opacity-100 transition"
                  style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(10,10,14,0.6)', border: '1px solid rgba(226,34,34,0.4)', color: '#f0e8e8', opacity: 0.85 }}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  onClick={() => swiperRef.current?.slideNext()}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center hover:opacity-100 transition"
                  style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(10,10,14,0.6)', border: '1px solid rgba(226,34,34,0.4)', color: '#f0e8e8', opacity: 0.85 }}
                >
                  <span aria-hidden="true">›</span>
                </button>
                <div className="absolute top-3 left-0 right-0 z-10 flex justify-center gap-1.5" role="group" aria-label="Choose image">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => swiperRef.current?.slideToLoop(i)}
                      aria-label={`Image ${i + 1}`}
                      aria-current={i === slide ? 'true' : undefined}
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
              <p
                className="font-sans text-[0.65rem] uppercase tracking-[0.4em] mb-1"
                style={{ color: 'var(--sith-red)' }}
              >
                {planet.region}
              </p>
              <h2
                id={titleId}
                className="font-display text-4xl font-black leading-none"
                style={{ color: 'var(--text-primary)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
              >
                {planet.name}
              </h2>
            </div>
          </div>

          <p id={loreId} className="font-serif italic text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {planet.lore}
          </p>

          {/* Facts from Wookieepedia (bundled locally) */}
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
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
