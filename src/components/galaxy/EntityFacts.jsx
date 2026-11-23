import React from 'react'
import { wikiUrl } from '../../data/wookieepedia'

// One label/value row of a facts table. Shared by every entity type's
// <Type>Facts.jsx component (see entityPanels/).
export function Fact({ label, value }) {
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

// A group of Wookieepedia-linked chips (affiliation / species / points of
// interest / ...). Every chip links out to Wookieepedia for now; once a
// chip's label resolves to a known in-app entity (cross-linking, planned),
// this becomes an in-app navigation button instead.
export function ChipLinks({ label, items }) {
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
