import React, { useRef, useCallback } from 'react'
import { sithRoutes, allYears, yearToT, tToYear, formatYear } from '../../data/sithRoutes'
import { getPlanet } from '../../data/planets'
import { sithLords } from '../../data/sithLords'

const nameOf = (sithId) => sithLords.find((s) => s.id === sithId)?.name || sithId

// All appearance events as dots for the axis (1:1 representation of the objects).
const events = sithRoutes.flatMap((route, lordIndex) =>
  route.appearances.map((a) => ({
    ...a,
    lordIndex,
    color: route.color,
    sithName: nameOf(route.sithId),
    planetName: getPlanet(a.planetId)?.name || a.planetId,
    t: yearToT(a.year),
  })),
)

// Timeline overlay at the bottom: draggable handle on a BBY/ABY axis. No
// auto-play — `t` (∈ [0,1]) is held by GalaxyMap and controlled here.
export default function Timeline({ t, onChange }) {
  const trackRef = useRef(null)

  const setFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const next = (clientX - rect.left) / rect.width
      onChange(Math.min(Math.max(next, 0), 1))
    },
    [onChange],
  )

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return
    setFromClientX(e.clientX)
  }

  const currentYear = tToYear(t)

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(720px,88vw)] rounded-sm px-6 pt-7 pb-5"
      style={{
        background: 'rgba(10,10,14,0.85)',
        border: '1px solid rgba(226,34,34,0.2)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-sans text-[0.6rem] uppercase tracking-[0.35em]"
          style={{ color: 'var(--sith-red)' }}
        >
          Galactic timeline
        </span>
        <span className="font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {formatYear(currentYear)}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative h-8 flex items-center"
        style={{ cursor: 'pointer', touchAction: 'none' }}
      >
        {/* Base line */}
        <div
          className="absolute left-0 right-0 h-[2px] rounded-full"
          style={{ background: 'var(--muted)' }}
        />
        {/* Filled part up to the handle */}
        <div
          className="absolute left-0 h-[2px] rounded-full"
          style={{
            width: `${t * 100}%`,
            background: 'linear-gradient(to right, var(--sith-red-dim), var(--sith-red))',
            boxShadow: '0 0 8px var(--sith-red-glow)',
          }}
        />

        {/* Event dots (each appearance 1:1) at the REAL year position, staggered
            vertically by lord. Clicking jumps the handle exactly to the year. */}
        {events.map((ev, i) => {
          const reached = ev.year <= currentYear + 0.001
          return (
            <div
              key={`${ev.sithName}-${ev.planetId}-${i}`}
              title={`${ev.sithName} · ${ev.planetName} · ${formatYear(ev.year)}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                onChange(ev.t)
              }}
              className="absolute rounded-full"
              style={{
                left: `${ev.t * 100}%`,
                top: `${4 + ev.lordIndex * 3}px`,
                width: '8px',
                height: '8px',
                marginLeft: '-4px',
                background: ev.color,
                cursor: 'pointer',
                opacity: reached ? 1 : 0.3,
                boxShadow: reached ? `0 0 6px ${ev.color}` : 'none',
                transition: 'opacity 0.12s',
              }}
            />
          )
        })}

        {/* Handle */}
        <div
          className="absolute"
          style={{ left: `${t * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '9999px',
              background: 'var(--sith-red)',
              border: '2px solid #f0e8e8',
              boxShadow: '0 0 12px var(--sith-red-glow)',
            }}
          />
        </div>
      </div>

      {/* End labels */}
      <div className="flex justify-between mt-2 font-sans text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
        <span>{formatYear(allYears[0])}</span>
        <span>{formatYear(allYears[allYears.length - 1])}</span>
      </div>
    </div>
  )
}
