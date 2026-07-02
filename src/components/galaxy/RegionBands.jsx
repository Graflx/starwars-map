import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { SCENE_SCALE } from '../../data/planets'
import { REGION_COLORS } from '../../data/planetFilters'
import shapes from '../../data/regionShapes.json'

// Region bands traced from the official 2D galaxy-map SVG (scripts/extract-regions.mjs):
// the exact canon shapes for Deep Core, Core, Colonies (ellipses) and Inner Rim,
// Expansion Region, Mid Rim (paths), converted to our position units. Each region
// is drawn as an annulus (its shape minus the next inner region) so the fills
// don't stack, plus a solid full-colour border. Outer Rim / Wild Space are the
// unshaded area beyond Mid Rim on the map, so they get no band (filter colour only).

// polygon (pos units [x,z]) → geometry Vector2 (x, -z) so the group's -90° X
// rotation lays it flat with world +z pointing the same way as our planets.
const toVec2 = (poly) => poly.map(([x, z]) => new THREE.Vector2(x * SCENE_SCALE, -z * SCENE_SCALE))

const signedArea = (v) => {
  let a = 0
  for (let i = 0; i < v.length; i++) {
    const p = v[i]
    const q = v[(i + 1) % v.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}
// Orient a ring: outer contours CCW (area > 0), holes CW, so ShapeGeometry carves cleanly.
const orient = (v, ccw) => ((signedArea(v) > 0) === ccw ? v : v.slice().reverse())

function borderGeometry(v) {
  const pos = []
  for (let i = 0; i <= v.length; i++) {
    const p = v[i % v.length]
    pos.push(p.x, p.y, 0)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return g
}

export default function RegionBands({ activeRegions }) {
  const bands = useMemo(() => {
    const { order, polygons } = shapes
    const northOf = (vs) => vs.reduce((m, p) => (p.y > m.y ? p : m), vs[0])
    const centroid = (vs) => new THREE.Vector2(
      vs.reduce((s, p) => s + p.x, 0) / vs.length,
      vs.reduce((s, p) => s + p.y, 0) / vs.length,
    )
    return order.map((region, k) => {
      const outer = orient(toVec2(polygons[region]), true)
      const shape = new THREE.Shape(outer)
      if (k > 0) shape.holes.push(new THREE.Path(orient(toVec2(polygons[order[k - 1]]), false)))
      // Place the label in the MIDDLE of the band ring (not on a border, where
      // adjacent regions' labels would collide): midway between this region's
      // north edge and the inner region's north edge (centre for the innermost).
      const oN = northOf(outer)
      const iN = k > 0 ? northOf(toVec2(polygons[order[k - 1]])) : centroid(outer)
      return {
        region,
        color: REGION_COLORS[region],
        fill: new THREE.ShapeGeometry(shape),
        border: borderGeometry(outer),
        labelPos: [(oN.x + iN.x) / 2, 0.4, -(oN.y + iN.y) / 2],
      }
    })
  }, [])

  // When the filter narrows to specific regions, only show those bands.
  const shown = activeRegions?.size ? bands.filter((b) => activeRegions.has(b.region)) : bands

  return (
    <group>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        {shown.map((b) => (
          <group key={b.region} renderOrder={-2}>
            <mesh geometry={b.fill}>
              <meshBasicMaterial color={b.color} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <line geometry={b.border}>
              <lineBasicMaterial color={b.color} transparent opacity={0.85} depthWrite={false} />
            </line>
          </group>
        ))}
      </group>

      {shown.map((b) => (
        <Html
          key={b.region}
          position={b.labelPos}
          center
          distanceFactor={110}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.72rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: b.color,
              opacity: 0.85,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {b.region}
          </div>
        </Html>
      ))}
    </group>
  )
}
