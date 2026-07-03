import React, { useRef } from 'react'

const OPTIONS = [
  { value: 'canon', label: 'Canon' },
  { value: 'legends', label: 'Legends' },
]

// Segmented switch (top right): Canon ⟷ Legends. Filters which worlds are shown.
// Exactly one of two mutually-exclusive states → ARIA radiogroup/radio, with
// the usual roving-tabindex + arrow-key behaviour (Tab reaches the group once,
// arrow keys move the selection within it and follow it with real DOM focus).
export default function ContinuityToggle({ value, onChange }) {
  const btnRefs = useRef([])

  const move = (dir) => {
    const i = OPTIONS.findIndex((o) => o.value === value)
    const nextIndex = (i + dir + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[nextIndex].value)
    btnRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Continuity"
      className="relative inline-flex rounded-sm overflow-hidden"
      style={{
        background: 'rgba(10,10,14,0.8)',
        border: '1px solid rgba(226,34,34,0.3)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {OPTIONS.map((o, i) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            ref={(el) => (btnRefs.current[i] = el)}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                move(1)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                move(-1)
              }
            }}
            className="font-sans text-[0.65rem] uppercase tracking-[0.25em] px-4 py-2 transition"
            style={{
              color: active ? '#f0e8e8' : 'var(--text-dim)',
              background: active ? 'var(--sith-red-dim)' : 'transparent',
              boxShadow: active ? 'inset 0 0 12px rgba(226,34,34,0.35)' : 'none',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
