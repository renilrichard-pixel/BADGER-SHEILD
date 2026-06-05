import { type SchemaTypeDefinition } from 'sanity'
import product from './schemas/product'
import category from './schemas/category'
import collection from './schemas/collection'
import banner from './schemas/banner'
import blog from './schemas/blog'
import testimonial from './schemas/testimonial'
import faq from './schemas/faq'
import settings from './schemas/settings'
import staticPage from './schemas/staticPage'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    product,
    category,
    collection,
    banner,
    blog,
    testimonial,
    faq,
    settings,
    staticPage,
  ],
}
