import React from 'react'

const OPTIONS = [
  { value: 'canon', label: 'Canon' },
  { value: 'legends', label: 'Legends' },
]

// Segmented switch (top right): Canon ⟷ Legends. Filters which worlds are shown.
export default function ContinuityToggle({ value, onChange }) {
  return (
    <div
      className="relative inline-flex rounded-sm overflow-hidden"
      style={{
        background: 'rgba(10,10,14,0.8)',
        border: '1px solid rgba(226,34,34,0.3)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {OPTIONS.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
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
