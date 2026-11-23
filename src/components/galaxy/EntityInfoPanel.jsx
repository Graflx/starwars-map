import React, { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import { entityTypes, getEntity } from '../../data/entityTypes'

// Slide-in panel on the right — the shared shell for every content type
// (accessibility plumbing, animation, image header). Per-type fact tables /
// chip groups live in entityPanels/<Type>Facts.jsx, looked up via the
// entityTypes registry so this file never needs to know a type exists.
//
// This is a direct generalization of the original PlanetInfoPanel.jsx: same
// focus-management, Escape-handling and slide-in animation, just driven by
// `{ type, id }` instead of a planet object directly.
export default function EntityInfoPanel({ type, id, onClose, openerRef, fallbackFocusRef }) {
  const [slide, setSlide] = useState(0)
  const swiperRef = useRef(null)
  const panelRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  const config = type ? entityTypes[type] : null
  const entity = type && id ? getEntity(type, id) : null

  const previewUrl = entity ? config.getPreview(entity.id) : null
  const slides = entity ? [previewUrl, ...config.getGallery(entity.id)].filter(Boolean) : []

  // Return focus to whatever opened the panel (captured by the caller before
  // anything could unmount) — falling back to a stable page anchor if that
  // element is no longer around (e.g. a search result inside the FilterPanel,
  // which closes itself the moment an entity is picked).
  const handleClose = () => {
    onClose()
    const opener = openerRef?.current
    if (opener && document.body.contains(opener) && typeof opener.focus === 'function') {
      opener.focus({ preventScroll: true })
    } else {
      fallbackFocusRef?.current?.focus({ preventScroll: true })
    }
  }

  // Reset to the first slide when the entity changes and move focus into the panel.
  useEffect(() => {
    if (!entity) return
    setSlide(0)
    swiperRef.current?.slideTo(0, 0)
    // preventScroll: true — without it, focusing the panel while it's still
    // mid slide-in (positioned off-screen at x:100% until the spring settles)
    // makes the browser's default "scroll the newly-focused element into
    // view" kick in, which scrolls <main> horizontally by the panel's own
    // width and back — the map briefly jumps left as a side effect.
    panelRef.current?.focus({ preventScroll: true })
  }, [entity])

  return (
    <AnimatePresence>
      {entity && (
        <motion.aside
          // No per-entity key: this is the single conditional child
          // AnimatePresence tracks here, so switching from one entity to
          // another while the panel is already open re-renders it in place
          // (content just swaps). Keying by entity.id would make
          // AnimatePresence treat every switch as "this element left, a new
          // one arrived" — exit-animating the old aside while enter-animating
          // a new one over it, briefly overlapping two <aside>s.
          ref={panelRef}
          aria-labelledby={titleId}
          aria-describedby={descId}
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
            aria-label={`Close ${config.label.toLowerCase()} details`}
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
              aria-label={`${entity.name} imagery`}
            >
              {slides.map((src, i) => (
                <SwiperSlide key={`${entity.id}-${i}`}>
                  <img src={src} alt={`${entity.name} (${i + 1} of ${slides.length})`} className="w-full h-full object-cover" />
                </SwiperSlide>
              ))}
            </Swiper>

            <div
              className="absolute inset-0 z-10 pointer-events-none"
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

            <div className="absolute bottom-4 left-8 right-8 z-10 pointer-events-none">
              <p
                className="font-sans text-[0.65rem] uppercase tracking-[0.4em] mb-1"
                style={{ color: 'var(--sith-red)' }}
              >
                {config.eyebrow(entity)}
              </p>
              <h2
                id={titleId}
                className="font-display text-4xl font-black leading-none"
                style={{ color: 'var(--text-primary)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
              >
                {entity.name}
              </h2>
            </div>
          </div>

          <p id={descId} className="font-serif italic text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {config.description(entity)}
          </p>

          <config.FactsComponent entity={entity} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
