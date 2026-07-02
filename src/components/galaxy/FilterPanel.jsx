import React, { useState } from 'react'
import SearchBar from './SearchBar'
import ContinuityToggle from './ContinuityToggle'
import { REGION_OPTIONS, TYPE_OPTIONS, FACTION_OPTIONS, REGION_COLORS } from '../../data/planetFilters'
import { getPlanetMaterial } from './planetImages'
import { factionLogo } from '../../data/factionLogos'

const ACCENT = '#e22222' // sith red — default chip colour
// #rrggbb → rgba string.
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
// Readable text colour on a solid `hex` background.
const contrast = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const L = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return L > 0.6 ? '#0a0a0e' : '#f5efef'
}
const typeThumb = (id) => getPlanetMaterial({ type: id }).map || null

function Section({ label, children }) {
  return (
    <div className="mb-4">
      <div className="font-sans text-[0.6rem] uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: '2.6rem',
        height: '1.4rem',
        borderRadius: '9999px',
        position: 'relative',
        flexShrink: 0,
        background: checked ? 'var(--sith-red-dim)' : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(226,34,34,0.4)',
        boxShadow: checked ? 'inset 0 0 12px rgba(226,34,34,0.35)' : 'none',
        transition: 'background .2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? 'calc(100% - 1.2rem)' : '2px',
          width: '1rem',
          height: '1rem',
          borderRadius: '9999px',
          background: '#f0e8e8',
          transition: 'left .2s',
        }}
      />
    </button>
  )
}

// Multi-select chips. `options` may be strings or {id,label}; `selected` is a Set.
// Each chip carries a colour (region colour where given, else sith red):
// selected → solid 100% colour fill + contrast text; unselected → faint tint.
// With `thumb(id)` (texture tile) or `logo(id)` (emblem) chips become vertical
// cards: a large image on top, label underneath.
function ChipGroup({ options, selected, onToggle, colorFor, thumb, logo }) {
  const cards = !!(thumb || logo)
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id
        const label = typeof o === 'string' ? o : o.label
        const active = selected.has(id)
        const col = (colorFor && colorFor(id)) || ACCENT
        const tinted = !!colorFor // region chips always show their colour
        const thumbUrl = thumb && thumb(id)
        const logoUrl = logo && logo(id)

        const base = {
          background: active ? col : tinted ? rgba(col, 0.16) : 'var(--obsidian)',
          border: `1px solid ${active ? col : tinted ? rgba(col, 0.5) : 'rgba(226,34,34,0.2)'}`,
          color: active ? contrast(col) : tinted ? '#efe7e7' : 'var(--text-dim)',
          transition: 'all .15s',
        }

        if (!cards) {
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              className="rounded-sm font-sans text-[0.7rem] px-2.5 py-1.5"
              style={base}
            >
              {label}
            </button>
          )
        }

        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className="rounded font-sans text-[0.62rem] flex flex-col items-center gap-1.5 p-2"
            style={{ ...base, width: '4.6rem' }}
          >
            {thumbUrl && (
              <img
                src={thumbUrl}
                alt=""
                style={{ width: '100%', height: 42, borderRadius: 3, objectFit: 'cover' }}
              />
            )}
            {logoUrl && (
              <span
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 3,
                  background: '#e9e9ee',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={logoUrl} alt="" style={{ maxWidth: 34, maxHeight: 34, objectFit: 'contain' }} />
              </span>
            )}
            <span className="text-center leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// A labelled on/off row for the overlay toggles.
function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <div>
        <div className="font-sans text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {sub && (
          <div className="font-sans text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>
            {sub}
          </div>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// Consolidated filter popup: search, canon/legends, famous-worlds toggle, plus
// region / world-type / faction multi-selects.
export default function FilterPanel({
  continuity,
  onContinuity,
  famousOnly,
  onFamous,
  onSearchSelect,
  visibleCount,
  regions,
  types,
  factions,
  onToggleRegion,
  onToggleType,
  onToggleFaction,
  onReset,
  activeFilters,
  showGrid,
  onShowGrid,
  showRegions,
  onShowRegions,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 font-sans text-[0.65rem] uppercase tracking-[0.3em] transition"
        style={{
          height: '2.4rem',
          background: open || activeFilters ? 'var(--sith-red-dim)' : 'rgba(10,10,14,0.8)',
          border: '1px solid rgba(226,34,34,0.3)',
          borderRadius: '2px',
          color: open || activeFilters ? '#f0e8e8' : 'var(--sith-red)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>⚙</span> Filter
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 z-50 p-5"
          style={{
            width: '21rem',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: 'rgba(10,10,14,0.97)',
            border: '1px solid rgba(226,34,34,0.3)',
            borderRadius: '3px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          <Section label="Search">
            <SearchBar
              continuity={continuity}
              onSelect={(p) => {
                onSearchSelect(p)
                setOpen(false)
              }}
            />
          </Section>

          <Section label="Continuity">
            <ContinuityToggle value={continuity} onChange={onContinuity} />
          </Section>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="font-sans text-sm" style={{ color: 'var(--text-primary)' }}>
                Famous worlds
              </div>
              <div className="font-sans text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>
                Only planets from the films
              </div>
            </div>
            <Toggle checked={famousOnly} onChange={onFamous} />
          </div>

          <Section label="Region">
            <ChipGroup
              options={REGION_OPTIONS}
              selected={regions}
              onToggle={onToggleRegion}
              colorFor={(id) => REGION_COLORS[id]}
            />
          </Section>

          <Section label="World type">
            <ChipGroup options={TYPE_OPTIONS} selected={types} onToggle={onToggleType} thumb={typeThumb} />
          </Section>

          <Section label="Faction">
            <ChipGroup options={FACTION_OPTIONS} selected={factions} onToggle={onToggleFaction} logo={factionLogo} />
          </Section>

          <Section label="Map overlays">
            <ToggleRow label="Sector grid" checked={showGrid} onChange={onShowGrid} />
            <ToggleRow label="Region bands" checked={showRegions} onChange={onShowRegions} />
          </Section>

          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(226,34,34,0.12)' }}
          >
            <span className="font-sans text-[0.6rem] uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
              {visibleCount.toLocaleString('en-US')} worlds shown
            </span>
            {activeFilters && (
              <button
                onClick={onReset}
                className="font-sans text-[0.6rem] uppercase tracking-[0.2em] transition hover:opacity-80"
                style={{ color: 'var(--sith-red)' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
