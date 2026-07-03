import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import GalaxyMap from './pages/GalaxyMap'

function App() {
  return (
    <>
      <GalaxyMap />
      <Analytics />
    </>
  )
}

export default App
