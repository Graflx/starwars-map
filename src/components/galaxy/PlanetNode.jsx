import React, { useRef, useState, useMemo, Suspense } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import { getPlanetMaterial } from './planetImages'
import { planetSize } from '../../data/planets'

// World direction toward the "sun" (must match the directionalLight in GalaxyScene).
const SUN_WORLD = new THREE.Vector3(6, 3, 5).normalize()

// Standard material for textured planets (Diffuse/Bump/Normal/Roughness),
// with subtle self-illumination from the diffuse so the night side stays visible.
function TexturedMaterial({ urls, active }) {
  const tex = useTexture(urls)
  return (
    <meshStandardMaterial
      map={tex.map}
      color={'#ffffff'}
      bumpMap={tex.bumpMap || null}
      bumpScale={0.06}
      normalMap={tex.normalMap || null}
      roughnessMap={tex.roughnessMap || null}
      emissive={'#ffffff'}
      emissiveMap={tex.map}
      emissiveIntensity={active ? 0.2 : 0.13}
      roughness={0.9}
      metalness={0.05}
    />
  )
}

// City material (Coruscant): brown, directionally lit surface; the city lights
// (emissiveMap) are masked to the NIGHT SIDE via a shader — just like the
// "Earth at night" effect.
function CityPlanetMaterial({ urls, active }) {
  const tex = useTexture(urls)
  const shaderRef = useRef(null)

  useFrame(({ camera }) => {
    const s = shaderRef.current
    if (!s) return
    // Sun direction in view space (matching the view-space normal in the shader).
    s.uniforms.uSunViewDir.value.copy(SUN_WORLD).transformDirection(camera.matrixWorldInverse)
  })

  const onBeforeCompile = (shader) => {
    shader.uniforms.uSunViewDir = { value: new THREE.Vector3(0, 0, 1) }
    shader.fragmentShader =
      'uniform vec3 uSunViewDir;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         // Lights only on the night side: day (normal toward sun) -> 0, night -> 1
         float nightFactor = smoothstep(0.25, -0.05, dot(normalize(normal), uSunViewDir));
         totalEmissiveRadiance *= nightFactor;`,
      )
    shaderRef.current = shader
  }

  return (
    <meshStandardMaterial
      map={tex.map}
      color={'#b28a52'}
      bumpMap={tex.bumpMap || null}
      bumpScale={0.06}
      emissive={'#ffb24d'}
      emissiveMap={tex.emissiveMap}
      emissiveIntensity={active ? 1.5 : 1.25}
      roughness={0.95}
      metalness={0.04}
      onBeforeCompile={onBeforeCompile}
    />
  )
}

// Fallback without texture: a tinted, slightly glowing sphere.
function PlainMaterial({ color, active }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={active ? 0.4 : 0.28}
      roughness={0.8}
      metalness={0.1}
    />
  )
}

// Separate, slowly rotating cloud layer (only when a _clouds map is present).
function CloudLayer({ url, size }) {
  const ref = useRef()
  const map = useTexture(url)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size * 1.02, 32, 32]} />
      <meshStandardMaterial map={map} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}

// A planet node: sphere + hover label. Picks a material based on available maps.
export default function PlanetNode({ planet, selected, onSelect }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  const { mainUrls, cloudsUrl } = useMemo(() => {
    const { clouds, ...rest } = getPlanetMaterial(planet)
    return { mainUrls: rest, cloudsUrl: clouds || null }
  }, [planet])

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15
  })

  const active = hovered || selected
  const scale = 1 // constant size — selecting/hovering never resizes the planet
  const size = planetSize(planet) // derived from diameter (no stored size)

  return (
    <group position={planet.position}>
      <group ref={meshRef} scale={scale}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onSelect(planet.id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = ''
          }}
        >
          <sphereGeometry args={[size, 32, 32]} />
          {mainUrls.map ? (
            mainUrls.emissiveMap ? (
              <CityPlanetMaterial urls={mainUrls} active={active} />
            ) : (
              <TexturedMaterial urls={mainUrls} active={active} />
            )
          ) : (
            <PlainMaterial color={planet.color} active={active} />
          )}
        </mesh>

        {/* Render clouds only on hover/selection (saves GPU with many planets). */}
        {cloudsUrl && active && (
          <Suspense fallback={null}>
            <CloudLayer url={cloudsUrl} size={size} />
          </Suspense>
        )}
      </group>

      {/* Glow halo (additive → glows instead of forming a dark ring) */}
      <mesh scale={scale}>
        <sphereGeometry args={[size * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={selected ? 0.35 : hovered ? 0.22 : 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Label — always when selected, otherwise only on hover */}
      {active && (
        <Html
          position={[0, size * 1.9, 0]}
          center
          distanceFactor={40}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#f0e8e8',
              whiteSpace: 'nowrap',
              textShadow: `0 0 10px ${planet.color}, 0 2px 6px rgba(0,0,0,0.9)`,
            }}
          >
            {planet.name}
          </div>
        </Html>
      )}
    </group>
  )
}
