import React, { useState, useMemo, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import GalaxyScene from '../components/galaxy/GalaxyScene'
import RouteLegend from '../components/galaxy/RouteLegend'
import EntityInfoPanel from '../components/galaxy/EntityInfoPanel'
import Timeline from '../components/galaxy/Timeline'
import NavControls from '../components/galaxy/NavControls'
import FilterPanel from '../components/galaxy/FilterPanel'
import { sithRoutes, tToYear } from '../data/sithRoutes'
import { planets, getPlanet } from '../data/planets'
import { matchesFilters, hasActiveFilters } from '../data/planetFilters'
import { entityTypes } from '../data/entityTypes'

// Sith travel routes + timeline hidden for now (the map should stay clean).
// To re-enable, just set to `true` — the code is preserved.
const SHOW_ROUTES = false

export default function GalaxyMap() {
  const [selectedEntity, setSelectedEntity] = useState(null) // { type, id } | null
  const [activeIds, setActiveIds] = useState(() => new Set(sithRoutes.map((r) => r.sithId)))
  const [timeT, setTimeT] = useState(1) // handle position 0..1; 1 = most recent events
  const [continuity, setContinuity] = useState('canon') // 'canon' | 'legends'
  const [famousOnly, setFamousOnly] = useState(true) // show only film worlds by default
  const [regions, setRegions] = useState(() => new Set())
  const [types, setTypes] = useState(() => new Set())
  const [factions, setFactions] = useState(() => new Set())
  const [showGrid, setShowGrid] = useState(true) // sector grid overlay
  const [showRegions, setShowRegions] = useState(true) // region colour bands

  // Toggle a value in one of the multi-select filter sets.
  const toggleIn = (setter) => (val) =>
    setter((prev) => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
  const resetFilters = () => {
    setRegions(new Set())
    setTypes(new Set())
    setFactions(new Set())
  }
  const controlsRef = useRef(null)
  const cameraApiRef = useRef(null) // animated camera API set by the CameraRig
  const mainHeadingRef = useRef(null) // focus fallback once EntityInfoPanel closes
  const infoPanelOpenerRef = useRef(null) // element to return focus to on close

  // Switch continuity; close the popup if the selected entity isn't shown in
  // the new mode (generic across every content type, not just planets).
  const changeContinuity = (mode) => {
    setContinuity(mode)
    if (!selectedEntity) return
    const config = entityTypes[selectedEntity.type]
    const entity = config.getEntity(selectedEntity.id)
    if (entity && !config.inContinuity(entity, mode)) setSelectedEntity(null)
  }

  // Open any entity's info panel. Captures the currently focused element
  // *synchronously*, before any of it can unmount (e.g. the search input,
  // whose containing FilterPanel closes in this same update), so
  // EntityInfoPanel can hand focus back to it once closed.
  const openEntity = (type, id) => {
    infoPanelOpenerRef.current = document.activeElement
    setSelectedEntity({ type, id })
  }

  // Focus a planet: open the popup AND smoothly move/center the camera.
  // Used by the search AND by clicking on a planet.
  const focusOnPlanet = (id) => {
    openEntity('planet', id)
    cameraApiRef.current?.focusPlanet(getPlanet(id))
  }

  const activeRoutes = useMemo(
    () => sithRoutes.filter((r) => activeIds.has(r.sithId)),
    [activeIds],
  )
  const currentYear = useMemo(() => tToYear(timeT), [timeT])
  const filters = useMemo(
    () => ({ continuity, famousOnly, regions, types, factions }),
    [continuity, famousOnly, regions, types, factions],
  )
  const visibleCount = useMemo(() => planets.filter((p) => matchesFilters(p, filters)).length, [filters])

  const toggleRoute = (sithId) =>
    setActiveIds((prev) => {
      const next = new Set(prev)
      next.has(sithId) ? next.delete(sithId) : next.add(sithId)
      return next
    })

  const toggleAll = () =>
    setActiveIds((prev) =>
      prev.size === sithRoutes.length ? new Set() : new Set(sithRoutes.map((r) => r.sithId)),
    )

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: 'var(--void)' }}>
      <h1 ref={mainHeadingRef} tabIndex={-1} className="sr-only">Star Wars Galaxy Map</h1>

      {/* Top right: filter popup (search + continuity + famous-worlds toggle) */}
      <div className="absolute top-3 right-3 z-40">
        <FilterPanel
          continuity={continuity}
          onContinuity={changeContinuity}
          famousOnly={famousOnly}
          onFamous={setFamousOnly}
          onSearchSelect={(hit) => (hit.type === 'planet' ? focusOnPlanet(hit.id) : openEntity(hit.type, hit.id))}
          visibleCount={visibleCount}
          regions={regions}
          types={types}
          factions={factions}
          onToggleRegion={toggleIn(setRegions)}
          onToggleType={toggleIn(setTypes)}
          onToggleFaction={toggleIn(setFactions)}
          onReset={resetFilters}
          activeFilters={hasActiveFilters(filters)}
          showGrid={showGrid}
          onShowGrid={setShowGrid}
          showRegions={showRegions}
          onShowRegions={setShowRegions}
        />
      </div>

      {/* The 3D scene is pointer/touch-driven and purely decorative from an
          assistive-tech standpoint — every planet it shows is reachable (and
          its details readable) via the Search field above, and the camera via
          the NavControls D-pad below. Hiding it keeps screen readers from
          announcing the floating, mouse-only hover labels rendered inside it. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          frameloop="demand"
          camera={{ position: [105, 88, 193], fov: 55 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'default' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Suspense fallback={null}>
            <GalaxyScene
              activeRoutes={SHOW_ROUTES ? activeRoutes : []}
              currentYear={currentYear}
              selectedPlanetId={selectedEntity?.type === 'planet' ? selectedEntity.id : null}
              onSelectPlanet={focusOnPlanet}
              controlsRef={controlsRef}
              cameraApiRef={cameraApiRef}
              filters={filters}
              showGrid={showGrid}
              showRegions={showRegions}
            />
          </Suspense>
        </Canvas>
      </div>

      {SHOW_ROUTES && (
        <>
          <RouteLegend activeIds={activeIds} onToggle={toggleRoute} onToggleAll={toggleAll} />
          <Timeline t={timeT} onChange={setTimeT} />
        </>
      )}

      <NavControls cameraApiRef={cameraApiRef} />

      <EntityInfoPanel
        type={selectedEntity?.type}
        id={selectedEntity?.id}
        onClose={() => setSelectedEntity(null)}
        openerRef={infoPanelOpenerRef}
        fallbackFocusRef={mainHeadingRef}
      />
    </main>
  )
}
