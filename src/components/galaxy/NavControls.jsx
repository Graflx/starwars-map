import React from 'react'

const ROT = 0.3 // radians per click
const ZOOM_IN = 0.7
const ZOOM_OUT = 1.4

// On-screen navigation (DOM). Calls the smoothly animated methods of the
// camera system (CameraRig) via cameraApiRef.
export default function NavControls({ cameraApiRef }) {
  const api = () => cameraApiRef.current
  const zoom = (f) => () => api()?.zoom(f)
  const rotate = (az, pol) => () => api()?.rotate(az, pol)
  const reset = () => api()?.reset()

  const Btn = ({ onClick, label, aria }) => (
    <button
      onClick={onClick}
      aria-label={aria}
      className="flex items-center justify-center hover:opacity-100 transition"
      style={{
        width: '2.1rem',
        height: '2.1rem',
        background: 'var(--obsidian)',
        border: '1px solid rgba(226,34,34,0.25)',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        lineHeight: 1,
        opacity: 0.85,
        borderRadius: '2px',
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="absolute bottom-3 right-3 z-20" role="group" aria-label="Camera controls">
      {/* Rotate (D-pad) + zoom, laid out as one square grid */}
      <div className="grid grid-cols-3 gap-1">
        <Btn onClick={zoom(ZOOM_OUT)} label="−" aria="Zoom out" />
        <Btn onClick={rotate(0, -ROT)} label="↑" aria="Rotate up" />
        <Btn onClick={zoom(ZOOM_IN)} label="+" aria="Zoom in" />
        <Btn onClick={rotate(-ROT, 0)} label="←" aria="Rotate left" />
        <Btn onClick={reset} label="⟳" aria="Reset view" />
        <Btn onClick={rotate(ROT, 0)} label="→" aria="Rotate right" />
        <span aria-hidden="true" />
        <Btn onClick={rotate(0, ROT)} label="↓" aria="Rotate down" />
        <span aria-hidden="true" />
      </div>
    </div>
  )
}
