// Shared image-file extraction/download helpers for sync-<type>.mjs scripts.

import { promises as fs } from 'node:fs'
import path from 'node:path'

// Pull a "File:Foo.png" reference out of a raw infobox `image` field value.
export function extractFileTitle(raw) {
  if (!raw) return null
  const m = /(?:File:)?\s*([^[\]|{}]+?\.(?:png|jpg|jpeg|gif|webp))/i.exec(String(raw))
  return m ? m[1].trim().replace(/ /g, '_') : null
}

// Detect the real image type from magic bytes — the Fandom CDN often serves
// webp regardless of the .png/.jpg url, so trust the bytes, not the extension.
export function sniffExt(buf) {
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg'
  if (buf.length >= 4 && buf.toString('ascii', 0, 3) === 'GIF') return 'gif'
  return 'png'
}

// Does this id already have a preview image on disk? (curated or synced)
export async function hasPreview(dir) {
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    try {
      await fs.access(path.join(dir, `preview.${ext}`))
      return true
    } catch {}
  }
  return false
}
