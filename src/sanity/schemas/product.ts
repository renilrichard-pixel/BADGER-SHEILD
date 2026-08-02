import { defineArrayMember, defineField, defineType } from 'sanity'

const SIZE_OPTIONS = [
  { title: 'XS', value: 'XS' },
  { title: 'S', value: 'S' },
  { title: 'M', value: 'M' },
  { title: 'L', value: 'L' },
  { title: 'XL', value: 'XL' },
  { title: 'XXL', value: 'XXL' },
  { title: 'OS', value: 'OS' },
]

function cleanSizes(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((size) => (typeof size === 'string' ? size.trim() : ''))
    .filter(Boolean)
}

function cleanSizeStockRows(value: unknown): Array<{ size: string; quantity: number }> {
  if (!Array.isArray(value)) return []

  return value
    .map((row) => ({
      size: typeof row?.size === 'string' ? row.size.trim() : '',
      quantity: typeof row?.quantity === 'number' && Number.isFinite(row.quantity) ? row.quantity : 0,
    }))
    .filter((row) => row.size !== '')
}

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'salePrice',
      title: 'Sale Price',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    // Primary single image (used as the main/hero image)
    defineField({
      name: 'image',
      title: 'Main Image',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    // Gallery of additional images
    defineField({
      name: 'images',
      title: 'Image Gallery',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (Rule) => Rule.required().error('Select a category before publishing this product.'),
    }),
    defineField({
      name: 'stock',
      title: 'Fallback Stock',
      description: 'Used only when Stock by Size is empty. If Stock by Size has rows, size quantities control availability.',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).integer(),
      initialValue: 0,
    }),
    defineField({
      name: 'sizeStock',
      title: 'Stock by Size',
      description: 'Optional. When filled, these quantities control size availability on the storefront.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'size',
              title: 'Size',
              type: 'string',
              options: {
                list: SIZE_OPTIONS,
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).integer(),
              initialValue: 0,
            }),
          ],
          preview: {
            select: { title: 'size', quantity: 'quantity' },
            prepare: ({ title, quantity }) => ({
              title: title || 'Size',
              subtitle: `${quantity ?? 0} in stock`,
            }),
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((rows, context) => {
          const stockRows = cleanSizeStockRows(rows)
          if (stockRows.length === 0) return true

          const selectedSizes = cleanSizes(context.document?.sizes)
          if (selectedSizes.length === 0) {
            return 'Select product Sizes before adding Stock by Size.'
          }

          const duplicateSize = stockRows.find((row, index) =>
            stockRows.findIndex((candidate) => candidate.size === row.size) !== index
          )
          if (duplicateSize) {
            return `Size ${duplicateSize.size} can only appear once.`
          }

          const invalidSize = stockRows.find((row) => !selectedSizes.includes(row.size))
          if (invalidSize) {
            return `Size ${invalidSize.size} is not selected in the product Sizes field.`
          }

          const missingSize = selectedSizes.find((size) => !stockRows.some((row) => row.size === size))
          if (missingSize) {
            return `Add a Stock by Size row for ${missingSize}, or leave Stock by Size empty to use Fallback Stock.`
          }

          return true
        }),
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: 'sizes',
      title: 'Sizes',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: SIZE_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'colors',
      title: 'Colors',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              title: 'Color Name',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'hex',
              title: 'Hex Code',
              type: 'string',
              description: 'e.g. #000000',
            }),
            defineField({
              name: 'image',
              title: 'Color Swatch / Product Image',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'hex' },
          },
        },
      ],
    }),
    defineField({
      name: 'material',
      title: 'Material',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Product',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'newArrival',
      title: 'New Arrival',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'bestSeller',
      title: 'Best Seller',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'active',
      title: 'Active Status',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
