import React from 'react'
import GalaxyMap from './pages/GalaxyMap'
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <>
      <GalaxyMap />
      <Analytics />
    </>
  )
}

export default App
