import React, { useId, useMemo, useRef, useState } from 'react'
import { planets, inContinuity } from '../../data/planets'
import { allSpecies, inContinuity as inSpeciesContinuity } from '../../data/species'
import { entityTypes } from '../../data/entityTypes'

// Levenshtein distance (small → similar) for typo-tolerant search.
function lev(a, b) {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let cur = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

function score(query, name) {
  const q = query.toLowerCase().trim()
  const n = name.toLowerCase()
  if (!q) return 0
  if (n.startsWith(q)) return 100
  if (q.length >= 2 && n.includes(q)) return 85
  // Typo tolerance — but strict depending on length, so that dissimilar names
  // (e.g. "Dorin" for "Alderan") are NOT suggested.
  const maxD = q.length <= 4 ? 1 : q.length <= 7 ? 2 : 3
  const d = lev(q, n)
  return d <= maxD ? 60 - d * 12 : 0
}

// Search bar with auto-suggestions across content types. onSelect(hit) is
// called on click/Enter, where `hit` is `{ id, type, name, subtitle }`.
// Only suggests entries visible in the current continuity ('canon' | 'legends').
// Implemented as an ARIA 1.2 combobox (input) + listbox (suggestions) pair:
// the input keeps focus at all times and drives the highlighted option via
// aria-activedescendant, exactly matching the existing arrow-key behaviour.
//
// NOTE: this hand-rolled matcher over two hardcoded type arrays is a stopgap
// to prove cross-type search wiring end-to-end (see EntityInfoPanel). It's
// meant to be superseded by a unified Fuse.js index over every content type's
// searchIndex.js entries, per the approved Codex plan (section 2.3) — do not
// keep bolting more types onto this list; build the real index instead.
export default function SearchBar({ onSelect, continuity = 'canon' }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const inputRef = useRef(null)
  const baseId = useId()
  const labelId = `${baseId}-label`
  const listId = `${baseId}-listbox`
  const optionId = (i) => `${baseId}-option-${i}`

  const suggestions = useMemo(() => {
    if (!value.trim()) return []
    const planetHits = planets
      .filter((p) => inContinuity(p, continuity))
      .map((p) => ({ id: p.id, type: 'planet', name: p.name, subtitle: p.region, s: score(value, p.name) }))
    const speciesHits = allSpecies
      .filter((sp) => inSpeciesContinuity(sp, continuity))
      .map((sp) => ({
        id: sp.id,
        type: 'species',
        name: sp.name,
        subtitle: sp.classification || sp.designation || entityTypes.species.label,
        s: score(value, sp.name),
      }))
    return [...planetHits, ...speciesHits]
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
  }, [value, continuity])

  const isOpen = open && suggestions.length > 0

  const choose = (hit) => {
    if (!hit) return
    onSelect(hit)
    setValue(hit.name)
    setOpen(false)
    // No explicit blur(): selecting a hit opens EntityInfoPanel, which
    // moves focus into itself and also needs document.activeElement (still
    // this input, until then) to know where to return focus once it closes.
  }

  const onKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' && suggestions[0]) choose(suggestions[0])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(suggestions[hi] || suggestions[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full">
      <label htmlFor={baseId} id={labelId} className="sr-only">
        Search
      </label>
      <input
        id={baseId}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setOpen(true)
          setHi(0)
        }}
        onFocus={() => value.trim() && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        className="w-full font-sans text-sm px-4 py-2 outline-none"
        style={{
          background: 'rgba(10,10,14,0.8)',
          border: '1px solid rgba(226,34,34,0.3)',
          borderRadius: '2px',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(6px)',
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? optionId(hi) : undefined}
      />

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 mt-1 z-50 overflow-hidden"
          style={{
            background: 'rgba(10,10,14,0.95)',
            border: '1px solid rgba(226,34,34,0.3)',
            borderRadius: '2px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {suggestions.map((hit, i) => (
            <li
              key={`${hit.type}-${hit.id}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === hi}
              // onMouseDown instead of onClick: fires before input.onBlur
              onMouseDown={(e) => {
                e.preventDefault()
                choose(hit)
              }}
              onMouseEnter={() => setHi(i)}
              className="w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition cursor-pointer"
              style={{ background: i === hi ? 'rgba(226,34,34,0.15)' : 'transparent' }}
            >
              <span className="font-display text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span aria-hidden="true">{entityTypes[hit.type]?.icon}</span>
                {hit.name}
              </span>
              <span
                className="font-sans text-[0.6rem] uppercase tracking-[0.15em] truncate"
                style={{ color: 'var(--text-dim)' }}
              >
                {hit.subtitle}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
