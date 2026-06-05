import createImageUrlBuilder from '@sanity/image-url'
import { dataset, projectId } from '../env'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: any) => {
  if (!source) return '';
  if (typeof source === 'string') return source;
  try {
    return imageBuilder.image(source).auto('format').fit('max').url()
  } catch (e) {
    return typeof source === 'object' && source.asset ? String(source.asset) : '';
  }
}
