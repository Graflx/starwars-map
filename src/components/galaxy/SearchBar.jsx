import React, { useMemo, useRef, useState } from 'react'
import { planets, inContinuity } from '../../data/planets'

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

// Search bar with auto-suggestions. onSelect(planet) is called on click/Enter.
// Only suggests worlds visible in the current continuity ('canon' | 'legends').
export default function SearchBar({ onSelect, continuity = 'canon' }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const inputRef = useRef(null)

  const suggestions = useMemo(() => {
    if (!value.trim()) return []
    return planets
      .filter((p) => inContinuity(p, continuity))
      .map((p) => ({ p, s: score(value, p.name) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.p)
  }, [value, continuity])

  const choose = (planet) => {
    if (!planet) return
    onSelect(planet)
    setValue(planet.name)
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
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
      <input
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
        placeholder="Search planet…"
        className="w-full font-sans text-sm px-4 py-2 outline-none"
        style={{
          background: 'rgba(10,10,14,0.8)',
          border: '1px solid rgba(226,34,34,0.3)',
          borderRadius: '2px',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {open && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 mt-1 z-50 overflow-hidden"
          style={{
            background: 'rgba(10,10,14,0.95)',
            border: '1px solid rgba(226,34,34,0.3)',
            borderRadius: '2px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {suggestions.map((p, i) => (
            <li key={p.id}>
              <button
                // onMouseDown instead of onClick: fires before input.onBlur
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(p)
                }}
                onMouseEnter={() => setHi(i)}
                className="w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition"
                style={{ background: i === hi ? 'rgba(226,34,34,0.15)' : 'transparent' }}
              >
                <span className="font-display text-sm" style={{ color: 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <span
                  className="font-sans text-[0.6rem] uppercase tracking-[0.15em] truncate"
                  style={{ color: 'var(--text-dim)' }}
                >
                  {p.region}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
