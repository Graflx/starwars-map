import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { getPlanet } from '../../data/planets'

// Draws a Sith Lord's travel route up to the current timeline year `Yc`.
// The path extends exactly to the last known stop (year <= Yc) and "jumps"
// forward when the next stop's year is crossed — NO intermediate points are
// interpolated (the time gaps between known stops say nothing about the actual
// travel duration).
export default function RoutePath({ route, currentYear }) {
  const { linePoints, tip } = useMemo(() => {
    const reached = route.appearances
      .filter((a) => a.year <= currentYear)
      .map((a) => getPlanet(a.planetId)?.position)
      .filter(Boolean)

    if (reached.length === 0) return { linePoints: [], tip: null }

    // Anchor points of the reached stops (merge consecutive identical places —
    // same place ⇒ no new segment).
    const anchors = []
    for (const pos of reached) {
      const v = new THREE.Vector3(...pos)
      if (anchors.length === 0 || !anchors[anchors.length - 1].equals(v)) anchors.push(v)
    }

    const tipVec = anchors[anchors.length - 1].clone()
    if (anchors.length < 2) return { linePoints: [], tip: tipVec }

    const curve = new THREE.CatmullRomCurve3(anchors, false, 'catmullrom', 0.3)
    return { linePoints: curve.getPoints(Math.max(20, anchors.length * 24)), tip: tipVec }
  }, [route, currentYear])

  if (!tip) return null

  return (
    <group>
      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color={route.color}
          lineWidth={2}
          transparent
          opacity={0.9}
          dashed
          dashSize={1.6}
          gapSize={1.0}
        />
      )}
      <mesh position={tip}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={route.color} />
      </mesh>
    </group>
  )
}
