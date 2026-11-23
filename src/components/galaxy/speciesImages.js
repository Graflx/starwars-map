// Thin per-type wrapper around entityImages.js — see that file for why the
// require.context() call itself can't be shared/parameterized.
import { buildImageIndex } from './entityImages'

const ctx = require.context('../../assets/species', true, /\.(png|jpe?g|webp)$/)
const { getPreview, getGallery } = buildImageIndex(ctx)

export const getSpeciesPreview = getPreview
export const getSpeciesGallery = getGallery
