import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html, useTexture } from '@react-three/drei'
import { planetSize } from '../../data/planets'
import { getPlanetMaterial } from './planetImages'

// Performance strategy: draw every planet that uses a *type* fallback texture
// with instancing — one InstancedMesh PER TEXTURE TYPE (desert / ice / forest /
// gas / lava / ocean / rock / swamp / terran). That's ~9 draw calls for
// thousands of planets, and each planet keeps its surface structure (so they're
// distinguishable), lit by the scene so you get the 3D day/night terminator.
//
// Planets are drawn at their TRUE size (planetSize) — the same size whether or
// not they're selected, so clicking never resizes them. The galaxy is spread
// out (SCENE_SCALE in planets.js) so full-size planets don't overlap.

const _o = new THREE.Object3D()

// Deterministic per-id spin so same-type planets don't all face identically.
function spin(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h / 0xffffffff) * Math.PI * 2
}

// One instanced, textured mesh for all planets of a given fallback type.
function TypeInstances({ type, planets, onHover, onSelect }) {
  const ref = useRef()
  const urls = useMemo(() => {
    const m = getPlanetMaterial({ type })
    const o = {}
    if (m.map) o.map = m.map
    if (m.bumpMap) o.bumpMap = m.bumpMap
    if (m.roughnessMap) o.roughnessMap = m.roughnessMap
    return o
  }, [type])
  const tex = useTexture(urls)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i]
      _o.position.set(p.position[0], p.position[1], p.position[2])
      _o.rotation.set(0, spin(p.id), 0)
      _o.scale.setScalar(planetSize(p))
      _o.updateMatrix()
      mesh.setMatrixAt(i, _o.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [planets])

  return (
    <instancedMesh
      key={planets.length}
      ref={ref}
      args={[null, null, planets.length]}
      frustumCulled={false}
      onPointerMove={(e) => {
        e.stopPropagation()
        const p = planets[e.instanceId]
        if (p) {
          onHover(p)
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        onHover(null)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        e.stopPropagation()
        const p = planets[e.instanceId]
        if (p) onSelect(p.id)
      }}
    >
      <sphereGeometry args={[1, 24, 24]} />
      <meshStandardMaterial
        map={tex.map || null}
        bumpMap={tex.bumpMap || null}
        bumpScale={0.05}
        roughnessMap={tex.roughnessMap || null}
        emissive={'#ffffff'}
        emissiveMap={tex.map || null}
        emissiveIntensity={0.13}
        roughness={0.9}
        metalness={0.05}
      />
    </instancedMesh>
  )
}

function Label({ planet }) {
  return (
    <Html position={planet.position} center distanceFactor={40} zIndexRange={[30, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div
        style={{
          whiteSpace: 'nowrap',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#f0e8e8',
          textShadow: `0 0 10px ${planet.color || '#fff'}, 0 2px 6px rgba(0,0,0,0.9)`,
        }}
      >
        {planet.name}
      </div>
    </Html>
  )
}

// Additive glow halo drawn around the hovered / selected planet (no resize of
// the planet itself).
function Halo({ planet, strong }) {
  const r = planetSize(planet) * 1.35
  return (
    <mesh position={planet.position}>
      <sphereGeometry args={[r, 16, 16]} />
      <meshBasicMaterial
        color={planet.color || '#ffffff'}
        transparent
        opacity={strong ? 0.32 : 0.16}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function PlanetField({ planets, selectedId, onSelect }) {
  const [hovered, setHovered] = useState(null)

  const groups = useMemo(() => {
    const byType = new Map()
    for (const p of planets) {
      const t = p.type || 'rock'
      if (!byType.has(t)) byType.set(t, [])
      byType.get(t).push(p)
    }
    return [...byType.entries()]
  }, [planets])

  const selected = useMemo(() => planets.find((p) => p.id === selectedId) || null, [planets, selectedId])

  return (
    <>
      {groups.map(([type, ps]) => (
        <TypeInstances key={type} type={type} planets={ps} onHover={setHovered} onSelect={onSelect} />
      ))}

      {selected && <Halo planet={selected} strong />}
      {selected && <Label planet={selected} />}
      {hovered && hovered.id !== selectedId && <Halo planet={hovered} />}
      {hovered && hovered.id !== selectedId && <Label planet={hovered} />}
    </>
  )
}
