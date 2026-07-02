#!/usr/bin/env node
// Extract the REAL region shapes from the official 2D galaxy-map SVG and convert
// them into our position units, so RegionBands draws the canon boundaries
// instead of a radial approximation.
//
// The SVG defines fill shapes for the 6 inner regions (Deep Core, Core,
// Colonies as ellipses; Inner Rim, Expansion Region, Mid Rim as bézier paths).
// Outer Rim / Wild Space are the UNSHADED area beyond Mid Rim on the map, so we
// don't draw a band for them (filter colour only).
//
// Calibration: the SVG's labelled Standard Galactic Grid (letters A–W as columns,
// numbers 1–21 as rows) is linear. We map SVG pixels → grid (col,row) → our
// position units the same way scripts/lib/position.mjs places planets
// (x=(col-L)*CELL, z=(row-9)*CELL), so shapes line up with our planet cloud.
//
// Output: src/data/regionShapes.json { order, polygons: { region: [[x,z]…] } }

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const CELL = 2.6 // must match position.mjs

// --- calibration from the SVG grid labels --------------------------------
// Letters A(=col0) at x≈1350, W(=col22) at x≈3928 → 117.18 px/col.
// Rows 1 at y≈46.79, 21 at y≈2368.79 → 116.1 px/row. Coruscant = L(11)-9 = origin.
const COL0_X = 1350
const COL_STEP = (3928 - 1350) / 22
const ROW1_Y = 46.79
const ROW_STEP = (2368.79 - 46.79) / 20
const pixelToPos = (px, py) => {
  const col = (px - COL0_X) / COL_STEP // 0-based (A=0)
  const row = (py - ROW1_Y) / ROW_STEP + 1 // 1-based
  return [(col - 11) * CELL, (row - 9) * CELL] // L-9 = origin, like position.mjs
}

// --- affine transform helpers (SVG matrix(a,b,c,d,e,f); our matrices have b=c=0)
const applyM = ([a, d, e, f], [x, y]) => [a * x + e, d * y + f]

// --- geometry samplers ---------------------------------------------------
function ellipsePoints(cx, cy, rx, ry, n = 96) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)])
  }
  return pts
}

function flattenPath(d, steps = 16) {
  const m = /M\s*(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)/.exec(d)
  let cur = [+m[1], +m[2]]
  const pts = [cur.slice()]
  const cRe = /C\s*(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)[,\s]+(-?\d[\d.]*)/g
  let seg
  while ((seg = cRe.exec(d))) {
    const p1 = [+seg[1], +seg[2]]
    const p2 = [+seg[3], +seg[4]]
    const p3 = [+seg[5], +seg[6]]
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const u = 1 - t
      pts.push([
        u * u * u * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ])
    }
    cur = p3
  }
  return pts
}

// --- region shapes as pulled from the SVG (transform = [a,d,e,f]) --------
const INNER_RIM = 'M2413,809C2355.4,833.956 2229.47,973.056 2237,1193C2244.53,1412.94 2220.31,1478.35 2340,1561C2459.69,1643.65 2618.06,1652.62 2714,1632C2809.94,1611.38 2892.09,1560.14 2906,1523C2919.91,1485.86 2913.35,1412.23 2925,1357C2936.65,1301.78 2982.87,1178.34 3001,1151C3019.13,1123.66 3092.16,1061.8 3067,972C3041.84,882.201 3009.42,834.14 2982,799C2954.58,763.86 2931.44,724.898 2894,739C2856.56,753.102 2740.91,805.567 2678,814C2651.87,817.503 2611.66,827.26 2566,824C2501.72,819.412 2431.13,801.146 2413,809Z'
const EXPANSION = 'M2413,809C2355.4,833.956 2276.92,1065.31 2284.45,1285.25C2291.97,1505.19 2282.4,1549.02 2402.1,1631.67C2521.79,1714.32 2537.93,1824.1 2633.86,1803.48C2729.8,1782.85 2931.33,1760.82 2945.24,1723.68C2959.15,1686.54 3052.01,1699.44 3054.93,1642.94C3058.47,1574.4 3154.01,1469.26 3173.47,1398.85C3190.24,1338.16 3134.86,963.855 3056.7,879.679C2994.74,812.949 2976.2,803.634 2939.05,788.613C2898.87,772.37 2779.23,815.82 2741.78,829.921C2704.34,844.023 2619.33,851.452 2574.59,841.187C2509.13,826.166 2431.13,801.146 2413,809Z'
const MID_RIM = 'M2377.33,735.1C2363.54,740.388 2351.08,770.757 2338.41,795.185C2262.42,941.633 2211.39,1370.81 2257.02,1547.18C2264.68,1576.77 2260.57,1607.72 2263.22,1637.31C2267.2,1681.93 2276.81,1721.59 2287.98,1734.01C2347.68,1800.38 2394.13,1883.42 2464.02,1923.65C2509.24,1949.67 2554.79,1940.78 2597.59,1950.87C2736.99,1983.75 2764.38,1892.64 2860.32,1872.01C2956.26,1851.39 3023.63,1889.34 3059.36,1876.7C3149.58,1844.79 3314.93,1778.16 3343.31,1730.25C3421.16,1598.82 3379.83,1508.67 3375.16,1435.46C3351.27,1060.87 3452.06,866.611 3372.5,783.919C3286.7,694.731 2968.24,817.261 2939.05,788.613C2856.78,707.875 2742.16,670.901 2702.86,664.689C2661.28,658.117 2503.83,670.322 2458.71,683.465C2394.13,702.281 2395.77,728.028 2377.33,735.1Z'

// inner → outer (so RegionBands can carve each as an annulus)
const REGIONS = [
  { region: 'Deep Core', kind: 'ellipse', m: [1, 1, -7, -14], cx: 2600.5, cy: 1192.5, rx: 142.5, ry: 147.5 },
  { region: 'Core Worlds', kind: 'ellipse', m: [1.68421, 1.65085, -1786.79, -792.136], cx: 2600.5, cy: 1192.5, rx: 142.5, ry: 147.5 },
  { region: 'Colonies', kind: 'ellipse', m: [2.20702, 2.19322, -3142.85, -1436.92], cx: 2600.5, cy: 1192.5, rx: 142.5, ry: 147.5 },
  { region: 'Inner Rim', kind: 'path', m: [1, 1, -2, -6], d: INNER_RIM },
  { region: 'Expansion Region', kind: 'path', m: [1.13045, 1.06517, -405.461, -115.005], d: EXPANSION },
  { region: 'Mid Rim', kind: 'path', m: [1.13045, 1.06517, -405.461, -115.005], d: MID_RIM },
]

async function main() {
  const order = []
  const polygons = {}
  for (const r of REGIONS) {
    const pxPts =
      r.kind === 'ellipse'
        ? ellipsePoints(r.cx, r.cy, r.rx, r.ry)
        : flattenPath(r.d)
    const poly = pxPts.map((p) => {
      const [px, py] = applyM(r.m, p)
      const [x, z] = pixelToPos(px, py)
      return [Math.round(x * 100) / 100, Math.round(z * 100) / 100]
    })
    order.push(r.region)
    polygons[r.region] = poly
  }

  // Outer Rim has no fill shape in the SVG (it's the unshaded outer area up to
  // the galaxy edge). Build its outer boundary from where Outer Rim planets
  // actually sit, around the Mid Rim centre, and let it enclose Mid Rim — so it
  // reads as the big outer band, carved by Mid Rim in RegionBands.
  const planets = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/planets.json'), 'utf8'))
  const mid = polygons['Mid Rim']
  const cx = mid.reduce((s, p) => s + p[0], 0) / mid.length
  const cz = mid.reduce((s, p) => s + p[1], 0) / mid.length
  const BINS = 72
  const norm = (r) => (r || '').replace(/\s+Territories$/i, '').trim()
  const binOf = (x, z) => {
    let a = Math.atan2(z - cz, x - cx)
    if (a < 0) a += Math.PI * 2
    return Math.min(BINS - 1, Math.floor((a / (Math.PI * 2)) * BINS))
  }
  const outerRimR = planets
    .filter((p) => Array.isArray(p.position) && norm(p.region) === 'Outer Rim')
    .map((p) => Math.hypot(p.position[0] - cx, p.position[2] - cz))
    .sort((a, b) => a - b)
  const cap = outerRimR[Math.floor(0.995 * outerRimR.length)] // ignore a few extreme strays
  // per-bin MAX radius so the boundary encloses (nearly) every Outer Rim planet
  const binMax = Array.from({ length: BINS }, () => null)
  for (const p of planets) {
    if (!Array.isArray(p.position) || norm(p.region) !== 'Outer Rim') continue
    const [x, , z] = p.position
    const r = Math.hypot(x - cx, z - cz)
    if (r > cap) continue
    const b = binOf(x, z)
    binMax[b] = Math.max(binMax[b] ?? 0, r)
  }
  const midR = Array.from({ length: BINS }, () => null)
  for (const [x, z] of mid) {
    const b = binOf(x, z)
    midR[b] = Math.max(midR[b] ?? 0, Math.hypot(x - cx, z - cz))
  }
  const fill = (a) => {
    for (let b = 0; b < BINS; b++) {
      if (a[b] != null) continue
      for (let d = 1; d <= BINS; d++) {
        const l = a[(b - d + BINS) % BINS]
        const r = a[(b + d) % BINS]
        if (l != null || r != null) { a[b] = l != null && r != null ? (l + r) / 2 : (l ?? r); break }
      }
    }
    return a
  }
  const midProf = fill(midR)
  const dilate = (a, w) => a.map((_, b) => { let m = 0; for (let d = -w; d <= w; d++) m = Math.max(m, a[(b + d + BINS) % BINS]); return m })
  const avg = (a, w) => a.map((_, b) => { let s = 0; for (let d = -w; d <= w; d++) s += a[(b + d + BINS) % BINS]; return s / (2 * w + 1) })
  // enclose every planet + Mid Rim, dilate to fill local dips, then average
  // several times for a soft, round edge (no angular spikes).
  let prof = fill(binMax).map((v, b) => Math.max(v * 1.02, midProf[b] * 1.05))
  prof = dilate(prof, 2)
  prof = avg(avg(avg(prof, 5), 4), 3)
  // Cosine-interpolate between bins into a dense polygon → smooth curved outline.
  const SUB = 6
  const outerRim = []
  for (let b = 0; b < BINS; b++) {
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB
      const mt = (1 - Math.cos(t * Math.PI)) / 2
      const r = prof[b] * (1 - mt) + prof[(b + 1) % BINS] * mt
      const a = ((b + t) / BINS) * Math.PI * 2
      outerRim.push([Math.round((cx + Math.cos(a) * r) * 100) / 100, Math.round((cz + Math.sin(a) * r) * 100) / 100])
    }
  }
  order.push('Outer Rim')
  polygons['Outer Rim'] = outerRim

  await fs.writeFile(
    path.join(ROOT, 'src/data/regionShapes.json'),
    JSON.stringify({ order, polygons }, null, 2) + '\n',
  )
  console.log('regionShapes.json written from SVG. Per-region extent (pos units):')
  for (const region of order) {
    const p = polygons[region]
    const xs = p.map((q) => q[0])
    const zs = p.map((q) => q[1])
    const cx = xs.reduce((a, b) => a + b, 0) / p.length
    const cz = zs.reduce((a, b) => a + b, 0) / p.length
    console.log(
      `  ${region.padEnd(17)} center(${cx.toFixed(1)},${cz.toFixed(1)}) ` +
        `x[${Math.min(...xs).toFixed(1)},${Math.max(...xs).toFixed(1)}] ` +
        `z[${Math.min(...zs).toFixed(1)},${Math.max(...zs).toFixed(1)}]`,
    )
  }
}
main()
