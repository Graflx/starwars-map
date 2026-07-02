import React, { useMemo } from 'react'
import { Html } from '@react-three/drei'
import {
  COL_MIN, COL_MAX, ROW_MIN, ROW_MAX, worldX, worldZ, COL_LABELS, ROW_LABELS,
} from '../../data/galacticGrid'

const labelStyle = {
  fontSize: '0.95rem',
  fontFamily: 'monospace',
  color: '#8aa0c8',
  opacity: 0.7,
  textShadow: '0 1px 3px rgba(0,0,0,0.95)',
}

// Standard Galactic Grid overlay: faint cell lines on the galactic plane plus
// column-letter / row-number labels around the edges (for "L-9"-style bearings).
export default function GalaxyGrid() {
  const positions = useMemo(() => {
    const x0 = worldX(COL_MIN - 0.5)
    const x1 = worldX(COL_MAX + 0.5)
    const z0 = worldZ(ROW_MIN - 0.5)
    const z1 = worldZ(ROW_MAX + 0.5)
    const pts = []
    for (let c = COL_MIN; c <= COL_MAX + 1; c++) {
      const x = worldX(c - 0.5)
      pts.push(x, 0, z0, x, 0, z1)
    }
    for (let r = ROW_MIN; r <= ROW_MAX + 1; r++) {
      const z = worldZ(r - 0.5)
      pts.push(x0, 0, z, x1, 0, z)
    }
    return new Float32Array(pts)
  }, [])

  return (
    <group>
      <lineSegments renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#3d4d70" transparent opacity={0.4} depthWrite={false} />
      </lineSegments>

      {COL_LABELS.map((c) => (
        <Html
          key={`c${c.text}`}
          position={[c.x, 0, worldZ(ROW_MAX + 1.1)]}
          center
          distanceFactor={70}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div style={labelStyle}>{c.text}</div>
        </Html>
      ))}
      {ROW_LABELS.map((r) => (
        <Html
          key={`r${r.text}`}
          position={[worldX(COL_MIN - 1.1), 0, r.z]}
          center
          distanceFactor={70}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div style={labelStyle}>{r.text}</div>
        </Html>
      ))}
    </group>
  )
}
