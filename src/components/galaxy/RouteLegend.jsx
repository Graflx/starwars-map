import React from 'react'
import { sithRoutes } from '../../data/sithRoutes'
import { sithLords } from '../../data/sithLords'

const lordOf = (sithId) => sithLords.find((s) => s.id === sithId)

// Overlay bottom left: one toggle per Sith Lord for their travel route.
export default function RouteLegend({ activeIds, onToggle, onToggleAll }) {
  const allOn = activeIds.size === sithRoutes.length

  return (
    <div
      className="absolute bottom-6 left-6 z-20 w-64 rounded-sm p-4"
      style={{
        background: 'rgba(10,10,14,0.82)',
        border: '1px solid rgba(226,34,34,0.2)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="font-sans text-[0.65rem] uppercase tracking-[0.35em]"
          style={{ color: 'var(--sith-red)' }}
        >
          Travel routes
        </h2>
        <button
          onClick={onToggleAll}
          className="font-sans text-[0.6rem] uppercase tracking-[0.2em] hover:opacity-80 transition"
          style={{ color: 'var(--text-dim)' }}
        >
          {allOn ? 'All off' : 'All on'}
        </button>
      </div>

      <ul className="space-y-1.5">
        {sithRoutes.map((route) => {
          const on = activeIds.has(route.sithId)
          const lord = lordOf(route.sithId)
          return (
            <li key={route.sithId}>
              <button
                onClick={() => onToggle(route.sithId)}
                aria-pressed={on}
                className="w-full flex items-center gap-3 py-1 text-left group"
                style={{ opacity: on ? 1 : 0.4, transition: 'opacity 0.15s' }}
              >
                <span
                  className="shrink-0 overflow-hidden rounded-full"
                  style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    border: `2px solid ${route.color}`,
                    boxShadow: on ? `0 0 10px ${route.color}` : 'none',
                    background: 'var(--obsidian)',
                  }}
                >
                  <img
                    src={lord?.image}
                    alt={lord?.name || route.sithId}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center top', mixBlendMode: lord?.blendMode || 'normal' }}
                  />
                </span>
                <span className="min-w-0">
                  <span
                    className="block font-display text-sm leading-tight truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {lord?.name || route.sithId}
                  </span>
                  <span
                    className="block font-serif italic text-[0.7rem] leading-tight truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {route.label}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
