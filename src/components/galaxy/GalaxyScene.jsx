import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars, OrbitControls } from '@react-three/drei'
import { planets, planetSize } from '../../data/planets'
import PlanetNode from './PlanetNode'
import PlanetField from './PlanetField'
import RoutePath from './RoutePath'
import RegionBands from './RegionBands'
import GalaxyGrid from './GalaxyGrid'
import { hasWorldTextures } from './planetImages'
import { matchesFilters } from '../../data/planetFilters'

// Caps the frame rate (instead of up to 120 fps on ProMotion displays) and
// pauses rendering when the tab is in the background → significantly less
// GPU load/heat. Runs with frameloop="demand".
function RenderLoop({ fps = 30 }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf
    let last = 0
    let stopped = false
    const interval = 1000 / fps
    const tick = (t) => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      if (t - last >= interval) {
        last = t
        invalidate()
      }
    }
    raf = requestAnimationFrame(tick)
    const onVisibility = () => {
      if (document.hidden) {
        stopped = true
        cancelAnimationFrame(raf)
      } else if (stopped) {
        stopped = false
        last = 0
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [invalidate, fps])
  return null
}

const MIN_DIST = 6
const MAX_DIST = 900
const HOME_POS = new THREE.Vector3(105, 88, 193) // matches SCENE_SCALE in planets.js

// Unified, smoothly animated camera system. Exposes methods via `apiRef` that
// are called from the DOM (search, NavControls):
//   focusPlanet(planet) – move in & center (pivot stays at the center)
//   zoom(factor)        – smoothly in/out
//   rotate(dAz, dPol)   – smoothly rotate
//   reset()             – initial view
// All only set a target; useFrame interpolates the camera smoothly toward it.
function CameraRig({ apiRef, controlsRef }) {
  const { camera } = useThree()
  const dest = useRef(null)
  const initialPos = useRef(null)

  useEffect(() => {
    if (!initialPos.current) initialPos.current = camera.position.clone()

    const targetVec = () => (controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3())

    apiRef.current = {
      focusPlanet(planet) {
        if (!planet) return
        const tp = new THREE.Vector3(...planet.position)
        const distp = planetSize(planet) * 5 + 5
        let dir = tp.clone()
        if (dir.lengthSq() < 1e-4) {
          dir = camera.position.clone()
          if (dir.lengthSq() < 1e-4) dir.set(0, 0.35, 1)
        }
        dest.current = { pos: tp.clone().add(dir.normalize().multiplyScalar(distp)), target: new THREE.Vector3() }
      },
      zoom(factor) {
        const t = targetVec()
        const off = camera.position.clone().sub(t)
        const len = THREE.MathUtils.clamp(off.length() * factor, MIN_DIST, MAX_DIST)
        dest.current = { pos: t.clone().add(off.setLength(len)), target: t }
      },
      rotate(dAz, dPol) {
        const t = targetVec()
        const off = camera.position.clone().sub(t)
        const sph = new THREE.Spherical().setFromVector3(off)
        sph.theta += dAz
        sph.phi = THREE.MathUtils.clamp(sph.phi + dPol, 0.15, Math.PI - 0.15)
        dest.current = { pos: t.clone().add(new THREE.Vector3().setFromSpherical(sph)), target: t }
      },
      reset() {
        dest.current = {
          pos: (initialPos.current || HOME_POS).clone(),
          target: new THREE.Vector3(),
        }
      },
    }
  }, [camera, apiRef, controlsRef])

  useFrame((_, delta) => {
    const d = dest.current
    const controls = controlsRef.current
    if (!d || !controls) return
    const k = Math.min(1, delta * 4)
    camera.position.lerp(d.pos, k)
    controls.target.lerp(d.target, k)
    controls.update()
    // Only snap-to-finish once BOTH position and pivot are essentially there, and
    // with a tiny threshold — a large one lopped off the last stretch as a jump.
    if (camera.position.distanceTo(d.pos) < 0.05 && controls.target.distanceTo(d.target) < 0.05) {
      camera.position.copy(d.pos)
      controls.target.copy(d.target)
      controls.update()
      dest.current = null
    }
  })

  return null
}

// Contents of the <Canvas>: lighting, star field, planet nodes, and the active
// travel routes. Camera control via OrbitControls (rotate / zoom / pan).
export default function GalaxyScene({
  activeRoutes,
  currentYear,
  selectedPlanetId,
  onSelectPlanet,
  controlsRef,
  cameraApiRef,
  filters,
  showGrid = true,
  showRegions = true,
}) {
  const visiblePlanets = useMemo(() => planets.filter((p) => matchesFilters(p, filters)), [filters])
  // Planets with bespoke world textures (Coruscant, Mustafar, …) keep a full
  // individual node; everyone else is drawn by the instanced PlanetField.
  const worldPlanets = useMemo(() => visiblePlanets.filter((p) => hasWorldTextures(p.id)), [visiblePlanets])
  const fieldPlanets = useMemo(() => visiblePlanets.filter((p) => !hasWorldTextures(p.id)), [visiblePlanets])
  // A planet reached via search may be filtered out — still show it (focused).
  const selectedPlanet = useMemo(
    () => (selectedPlanetId ? planets.find((p) => p.id === selectedPlanetId) : null),
    [selectedPlanetId],
  )
  const selectedHidden = selectedPlanet && !visiblePlanets.includes(selectedPlanet)
  return (
    <>
      <color attach="background" args={['#060608']} />

      {/* Directional "sun" light → consistent day/night terminator on all
          planets (a point light at the center sat right on Coruscant and flooded it). */}
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#8fa0d0', '#241a14', 0.3]} />
      <directionalLight position={[6, 3, 5]} intensity={2.4} color="#fff3da" />
      <directionalLight position={[-6, -2, -4]} intensity={0.25} color="#7a88bb" />

      <RenderLoop fps={30} />

      <Stars radius={550} depth={150} count={4000} factor={4} saturation={0} fade speed={0} />

      {/* Official-map overlays on the galactic plane (behind the planets). */}
      {showRegions && <RegionBands activeRegions={filters?.regions} />}
      {showGrid && <GalaxyGrid />}

      {/* Bulk planets: instanced, textured per fallback type (one draw call each). */}
      <PlanetField planets={fieldPlanets} selectedId={selectedPlanetId} onSelect={onSelectPlanet} />

      {/* The few worlds with bespoke textures keep full individual nodes. */}
      {worldPlanets.map((planet) => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          selected={planet.id === selectedPlanetId}
          onSelect={onSelectPlanet}
        />
      ))}

      {/* Selected planet that's currently filtered out → still render it. */}
      {selectedHidden && (
        <PlanetNode key={selectedPlanet.id} planet={selectedPlanet} selected onSelect={onSelectPlanet} />
      )}

      {activeRoutes.map((route) => (
        <RoutePath key={route.sithId} route={route} currentYear={currentYear} />
      ))}

      <CameraRig apiRef={cameraApiRef} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={MIN_DIST}
        maxDistance={MAX_DIST}
        makeDefault
      />
    </>
  )
}
